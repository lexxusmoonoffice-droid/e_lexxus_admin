/**
 * Find the first free port starting at --base-port, then run the given
 * command with {PORT} substituted. If base-port is already bound (by
 * another Next instance, a sibling app, whatever) we try base-port + 1,
 * + 2, … up to --max-tries.
 *
 *   node scripts/pick-port-and-run.cjs --base-port 3000 -- next dev -p {PORT}
 *
 * The port probe binds on BOTH IPv4 (0.0.0.0) and IPv6 (::) because
 * Next.js dev binds to `::` by default on Linux/Windows and just 0.0.0.0
 * is not enough to know it's free (you'll hit EADDRINUSE :::3000 from
 * inside Next even though the IPv4 probe succeeded).
 */

const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { basePort: null, maxTries: 50, cmd: [] };

  const sepIdx = args.indexOf('--');
  const left = sepIdx === -1 ? args : args.slice(0, sepIdx);
  const right = sepIdx === -1 ? [] : args.slice(sepIdx + 1);

  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    if (a === '--base-port') {
      out.basePort = Number(left[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--max-tries') {
      out.maxTries = Number(left[i + 1]);
      i += 1;
      continue;
    }
  }

  out.cmd = right;
  return out;
}

/**
 * A port is only "free" if we can bind it on both IPv4 and IPv6.
 * Most dev servers (Next, Vite, etc.) bind `::` which satisfies both
 * stacks on a dual-stack socket — so if *either* family is taken, the
 * server will fail to listen.
 */
function canListenOn(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const done = (ok) => {
      server.removeAllListeners();
      try { server.close(() => resolve(ok)); } catch { resolve(ok); }
    };
    server.once('error', () => done(false));
    server.once('listening', () => done(true));
    try {
      server.listen(port, host);
    } catch {
      resolve(false);
    }
  });
}

async function isPortFree(port) {
  const v4 = await canListenOn('0.0.0.0', port);
  if (!v4) return false;
  const v6 = await canListenOn('::', port);
  return v6;
}

async function pickPort(basePort, maxTries) {
  for (let i = 0; i <= maxTries; i += 1) {
    const candidate = basePort + i;
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(candidate);
    if (free) {
      if (i > 0) {
        // eslint-disable-next-line no-console
        console.log(`[dev] port ${basePort} is busy — using ${candidate} instead`);
      }
      return candidate;
    }
  }
  throw new Error(`No free port found in range ${basePort}-${basePort + maxTries}`);
}

/**
 * Returns a child_process.spawn invocation that doesn't need `shell: true`.
 * Resolves Windows .cmd shims and Node-based binaries directly so we
 * avoid DEP0190 ("Passing args with shell: true is deprecated").
 */
function resolveCommand(cmd) {
  const [bin, ...rest] = cmd;
  const isWin = process.platform === 'win32';

  // Next-specific fast path: run the JS entry with the current node, no shell.
  if (bin === 'next') {
    try {
      const nextBin = require.resolve('next/dist/bin/next');
      return { file: process.execPath, args: [nextBin, ...rest] };
    } catch {
      // fall through to generic resolution
    }
  }

  // Generic: prefer local node_modules/.bin shim
  const localBin = path.resolve('node_modules', '.bin', isWin ? `${bin}.cmd` : bin);
  try {
    // require.resolve throws if missing — use a stat-style check instead
    // eslint-disable-next-line global-require
    require('fs').accessSync(localBin);
    return { file: localBin, args: rest };
  } catch {
    // fallthrough — rely on PATH
  }

  // Last resort: pass through. On Windows we have to set shell:true so
  // .cmd/.bat files resolve; we pass a single joined string to avoid
  // DEP0190, escaping anything shell-sensitive.
  if (isWin) {
    const joined = [bin, ...rest].map((a) => (/[\s"]/.test(a) ? `"${String(a).replace(/"/g, '""')}"` : a)).join(' ');
    return { file: joined, args: undefined, shell: true };
  }
  return { file: bin, args: rest };
}

async function main() {
  const { basePort, maxTries, cmd } = parseArgs(process.argv);
  if (!basePort || !Number.isFinite(basePort)) {
    // eslint-disable-next-line no-console
    console.error('Missing --base-port. Example: node scripts/pick-port-and-run.cjs --base-port 3000 -- next dev -p {PORT}');
    process.exit(2);
  }
  if (!cmd.length) {
    // eslint-disable-next-line no-console
    console.error('Missing command after --. Example: ... -- next dev -p {PORT}');
    process.exit(2);
  }

  const port = await pickPort(basePort, maxTries);
  const replaced = cmd.map((c) => c.replaceAll('{PORT}', String(port)));

  // eslint-disable-next-line no-console
  console.log(`[dev] using port ${port}`);

  const resolved = resolveCommand(replaced);
  const spawnOpts = {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  };
  if (resolved.shell) spawnOpts.shell = true;
  const child = spawn(resolved.file, resolved.args, spawnOpts);

  const forward = (sig) => () => { if (!child.killed) child.kill(sig); };
  process.on('SIGINT', forward('SIGINT'));
  process.on('SIGTERM', forward('SIGTERM'));
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
