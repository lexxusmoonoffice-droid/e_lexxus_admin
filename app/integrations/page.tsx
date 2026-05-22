"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Topbar from "@/components/Topbar";
import { api, apiError } from "@/lib/api";

type Snapshot = {
  payments: {
    zohoEnabled: boolean;
    stripeEnabled: boolean;
    razorpayEnabled: boolean;
    defaultProvider: "zoho" | "stripe" | "razorpay";
  };
  b2: {
    keyId: string;
    appKeySet: boolean;
    bucketName: string;
    region: string;
    endpoint: string;
    endpointHost: string;
    cdnDomain: string;
  };
  cloudflare: { accountId: string; apiTokenSet: boolean };
  smtp: { host: string; port: number | string; secure: boolean; user: string; passSet: boolean; mailFrom: string };
  zoho: {
    clientId: string;
    clientSecretSet: boolean;
    refreshTokenSet: boolean;
    webhookSecretSet: boolean;
    signingKeySet: boolean;
    apiBase: string;
    accountsHost: string;
    connectedAt: string | null;
    scope: string | null;
  };
  stripe: {
    secretKeySet: boolean;
    webhookSecretSet: boolean;
    currency: string;
  };
  razorpay: {
    keyId: string;
    keySecretSet: boolean;
    webhookSecretSet: boolean;
    currency: string;
  };
  limits: {
    downloadTokenTtlDays: number;
    downloadLimitPerOrder: number;
    downloadRateLimitPerHour: number;
    globalRateLimitPer15Min: number;
  };
  observability: { sentryDsnSet: boolean };
};

/* ─────────── validators ─────────── */
const isHttpsUrl = (v: string) => /^https:\/\/[^\s]+$/i.test(v);
const isUrl = (v: string) => /^https?:\/\/[^\s]+$/i.test(v);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isHostname = (v: string) => /^[a-z0-9.-]+$/i.test(v);
const isPositiveInt = (v: string | number) => Number.isInteger(Number(v)) && Number(v) > 0;

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading…</div>}>
      <IntegrationsInner />
    </Suspense>
  );
}

function IntegrationsInner() {
  const qs = useSearchParams();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<{ integrations: Snapshot }>("/admin/integrations");
      setSnap(data.integrations);
    } catch (err) {
      toast.error(apiError(err, "Load failed"));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const flag = qs?.get("zoho");
    if (flag === "connected") toast.success("Zoho connected");
    if (flag === "error") toast.error(`Zoho connect failed: ${qs?.get("reason") || ""}`);
  }, [qs]);

  async function put(section: string, patch: Record<string, unknown>, label: string) {
    setBusy(section);
    try {
      await api.put(`/admin/integrations/${section}`, patch);
      toast.success(`${label} saved`);
      await reload();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    } finally { setBusy(null); }
  }

  async function test(kind: "b2" | "smtp" | "cloudflare" | "stripe" | "razorpay", body?: Record<string, unknown>) {
    setBusy(`test-${kind}`);
    try {
      const { data } = await api.post(`/admin/integrations/test/${kind}`, body || {});
      if ((data as { ok: boolean }).ok) toast.success(`${kind.toUpperCase()} test passed`);
      else toast.error(`${kind.toUpperCase()} test failed: ${(data as { error?: string }).error || "unknown"}`);
    } catch (err) {
      toast.error(apiError(err, `${kind} test failed`));
    } finally { setBusy(null); }
  }

  async function connectZoho() {
    setBusy("zoho-connect");
    try {
      const { data } = await api.get<{ authUrl: string }>("/zoho/connect");
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error(apiError(err, "Zoho connect failed"));
      setBusy(null);
    }
  }

  async function disconnectZoho() {
    const ok = await confirm({
      title: "Disconnect Zoho?",
      message: "Payments will stop working until you reconnect.",
      confirmText: "Disconnect",
      variant: "danger",
    });
    if (!ok) return;
    setBusy("zoho-disconnect");
    try {
      await api.post("/zoho/disconnect");
      toast.success("Zoho disconnected");
      await reload();
    } catch (err) {
      toast.error(apiError(err, "Disconnect failed"));
    } finally { setBusy(null); }
  }

  if (!snap) {
    return (
      <>
        <Topbar title="Integrations" />
        <div className="p-6 text-sm text-neutral-500">Loading…</div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Integrations" />
      <div className="p-6 max-w-[960px] space-y-6">
        <p className="text-sm text-neutral-500">
          Fields marked with <span className="text-rose-600 font-semibold">*</span> are required.
          Secret fields keep their current value unless you type a new one (placeholder shows as <code className="bg-neutral-100 px-1">•••• already set</code>).
          Saves take effect on the next backend request — no restart.
        </p>

        <PaymentProvidersSection snap={snap} put={put} busy={busy} />
        <ZohoSection snap={snap} connect={connectZoho} disconnect={disconnectZoho} put={put} busy={busy} />
        <StripeSection snap={snap} put={put} test={test} busy={busy} />
        <RazorpaySection snap={snap} put={put} test={test} busy={busy} />
        <B2Section snap={snap} put={put} test={test} busy={busy} />
        <SmtpSection snap={snap} put={put} test={test} busy={busy} />
        <CloudflareSection snap={snap} put={put} test={test} busy={busy} />
        <LimitsSection snap={snap} put={put} busy={busy} />
        <ObservabilitySection snap={snap} put={put} busy={busy} />
      </div>
    </>
  );
}

/* ─────────── shared UI bits ─────────── */

function Card({ title, status, children }: { title: string; status?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {status}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ ok, okLabel = "Connected", offLabel = "Not set" }: { ok: boolean; okLabel?: string; offLabel?: string }) {
  return (
    <span className={`text-xs px-2 py-1 rounded ${ok ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
      {ok ? okLabel : offLabel}
    </span>
  );
}

type FieldProps = {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** Field is a secret that's already stored — an empty submit keeps it. */
  alreadySet?: boolean;
  /** Validation error to display inline. */
  error?: string | null;
  min?: number;
  max?: number;
};

function Field({ label, value, onChange, type = "text", placeholder, help, required, alreadySet, error, min, max }: FieldProps) {
  const showStar = required && !alreadySet;
  return (
    <label className="block">
      <span className="label">
        {label}
        {showStar && <span className="text-rose-600 ml-1">*</span>}
        {required && alreadySet && <span className="text-[10px] text-neutral-400 ml-2">optional — already set, leave blank to keep</span>}
        {!required && <span className="text-[10px] text-neutral-400 ml-2">optional</span>}
      </span>
      <input
        className={`input ${error ? "border-rose-500 focus:border-rose-600" : ""}`}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      {help && !error && <p className="text-xs text-neutral-500 mt-1">{help}</p>}
    </label>
  );
}

/* ─────────── sections ─────────── */

function B2Section({ snap, put, test, busy }: any) {
  const [f, setF] = useState({
    keyId: snap.b2.keyId,
    appKey: "",
    bucketName: snap.b2.bucketName,
    region: snap.b2.region,
    endpoint: snap.b2.endpoint,
    endpointHost: snap.b2.endpointHost,
    cdnDomain: snap.b2.cdnDomain,
  });
  useEffect(() => {
    setF((prev) => ({ ...prev, keyId: snap.b2.keyId, bucketName: snap.b2.bucketName, region: snap.b2.region, endpoint: snap.b2.endpoint, endpointHost: snap.b2.endpointHost, cdnDomain: snap.b2.cdnDomain }));
  }, [snap]);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (!f.keyId.trim()) e.keyId = "Key ID is required";
    if (!f.bucketName.trim()) e.bucketName = "Bucket name is required";
    if (!f.region.trim()) e.region = "Region is required";
    if (!f.endpoint.trim() || !isHttpsUrl(f.endpoint)) e.endpoint = "Endpoint must be an https:// URL";
    if (f.endpointHost && !isHostname(f.endpointHost)) e.endpointHost = "Endpoint host looks invalid";
    if (!snap.b2.appKeySet && !f.appKey.trim()) e.appKey = "Application key is required";
    // cdnDomain is optional — only validate when non-empty
    if (f.cdnDomain && !/^[a-z0-9.-]+$/i.test(f.cdnDomain)) e.cdnDomain = "CDN domain looks invalid";
    return e;
  }, [f, snap.b2.appKeySet]);
  const hasErrors = Object.values(errors).some(Boolean);
  const canTest = !!snap.b2.keyId && snap.b2.appKeySet && !!snap.b2.bucketName;

  return (
    <Card title="Storage — Backblaze B2" status={<StatusPill ok={!!snap.b2.keyId && snap.b2.appKeySet} okLabel="Credentials set" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Key ID" required value={f.keyId} onChange={(v) => setF({ ...f, keyId: v })} placeholder="005xxxxxxxxxxx" error={errors.keyId} />
        <Field label="Application key" required alreadySet={snap.b2.appKeySet} value={f.appKey} onChange={(v) => setF({ ...f, appKey: v })} type="password" placeholder={snap.b2.appKeySet ? "•••• already set" : ""} error={errors.appKey} />
        <Field label="Bucket name" required value={f.bucketName} onChange={(v) => setF({ ...f, bucketName: v })} error={errors.bucketName} />
        <Field label="Region" required value={f.region} onChange={(v) => setF({ ...f, region: v })} placeholder="us-east-005" error={errors.region} />
        <Field label="Endpoint" required value={f.endpoint} onChange={(v) => setF({ ...f, endpoint: v })} placeholder="https://s3.us-east-005.backblazeb2.com" error={errors.endpoint} />
        <Field label="Endpoint host (for CDN rewrite)" value={f.endpointHost} onChange={(v) => setF({ ...f, endpointHost: v })} placeholder="s3.us-east-005.backblazeb2.com" error={errors.endpointHost} />
        <Field label="CDN domain" value={f.cdnDomain} onChange={(v) => setF({ ...f, cdnDomain: v })} help="Leave blank to serve directly from B2 (local/dev)." error={errors.cdnDomain} />
      </div>
      <div className="flex gap-2">
        <button disabled={busy === "b2" || hasErrors} onClick={() => put("b2", f, "B2")} className="btn-primary disabled:opacity-50">{busy === "b2" ? "Saving…" : "Save"}</button>
        <button disabled={busy === "test-b2" || !canTest} title={!canTest ? "Save credentials first" : undefined} onClick={() => test("b2")} className="btn-outline disabled:opacity-50">{busy === "test-b2" ? "Testing…" : "Test upload"}</button>
      </div>
    </Card>
  );
}

function ZohoSection({ snap, connect, disconnect, put, busy }: any) {
  const [f, setF] = useState({ clientId: snap.zoho.clientId, clientSecret: "", apiBase: snap.zoho.apiBase, accountsHost: snap.zoho.accountsHost });
  const [webhookSecret, setWebhookSecret] = useState("");
  useEffect(() => {
    setF((p) => ({ ...p, clientId: snap.zoho.clientId, apiBase: snap.zoho.apiBase, accountsHost: snap.zoho.accountsHost }));
  }, [snap]);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (!f.clientId.trim()) e.clientId = "Client ID is required";
    else if (!/^[\d.a-zA-Z]+$/.test(f.clientId)) e.clientId = "Client ID looks invalid";
    if (!snap.zoho.clientSecretSet && !f.clientSecret.trim()) e.clientSecret = "Client secret is required";
    if (!f.apiBase.trim() || !isHttpsUrl(f.apiBase)) e.apiBase = "API base must be an https:// URL";
    if (!f.accountsHost.trim() || !isHttpsUrl(f.accountsHost)) e.accountsHost = "Accounts host must be an https:// URL";
    return e;
  }, [f, snap.zoho.clientSecretSet]);
  const hasErrors = Object.values(errors).some(Boolean);

  const webhookSecretError = webhookSecret.length > 0 && webhookSecret.length < 8
    ? "Secret must be at least 8 characters"
    : null;

  async function saveSecret() {
    if (webhookSecretError || webhookSecret.length < 8) return;
    try {
      await api.post("/zoho/webhook-secret", { secret: webhookSecret });
      toast.success("Webhook secret stored");
      setWebhookSecret("");
      window.dispatchEvent(new CustomEvent("integrations:reload"));
      setTimeout(() => location.reload(), 400);
    } catch (err) { toast.error(apiError(err, "Save failed")); }
  }

  return (
    <Card title="Payments — Zoho" status={<StatusPill ok={snap.zoho.refreshTokenSet} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Client ID" required value={f.clientId} onChange={(v) => setF({ ...f, clientId: v })} error={errors.clientId} help="From the Zoho API console — starts with 1000." />
        <Field label="Client secret" required alreadySet={snap.zoho.clientSecretSet} value={f.clientSecret} onChange={(v) => setF({ ...f, clientSecret: v })} type="password" placeholder={snap.zoho.clientSecretSet ? "•••• already set" : ""} error={errors.clientSecret} />
        <Field label="API base" required value={f.apiBase} onChange={(v) => setF({ ...f, apiBase: v })} placeholder="https://payments.zoho.in/api/v1" error={errors.apiBase} />
        <Field label="Accounts host" required value={f.accountsHost} onChange={(v) => setF({ ...f, accountsHost: v })} placeholder="https://accounts.zoho.in" error={errors.accountsHost} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button disabled={busy === "zoho" || hasErrors} onClick={() => put("zoho", f, "Zoho credentials")} className="btn-primary disabled:opacity-50">Save</button>
        {!snap.zoho.refreshTokenSet ? (
          <button
            disabled={busy === "zoho-connect" || !snap.zoho.clientId || !snap.zoho.clientSecretSet}
            title={!snap.zoho.clientId || !snap.zoho.clientSecretSet ? "Save Client ID + secret first" : undefined}
            onClick={connect}
            className="btn-outline disabled:opacity-50"
          >
            {busy === "zoho-connect" ? "Redirecting…" : "Connect with OAuth"}
          </button>
        ) : (
          <>
            <button disabled={busy === "zoho-connect"} onClick={connect} className="btn-outline">Reconnect</button>
            <button disabled={busy === "zoho-disconnect"} onClick={disconnect} className="btn-outline text-rose-600">Disconnect</button>
          </>
        )}
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <label className="block">
          <span className="label">
            Webhook secret
            {!snap.zoho.webhookSecretSet && <span className="text-rose-600 ml-1">*</span>}
            {snap.zoho.webhookSecretSet && <span className="text-[10px] text-neutral-400 ml-2">already set — leave blank to keep</span>}
          </span>
          <p className="text-xs text-neutral-500 mb-2">
            HMAC-verifies <code className="bg-neutral-100 px-1">/api/payments/webhook</code> payloads. Minimum 8 chars.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              className={`input flex-1 ${webhookSecretError ? "border-rose-500" : ""}`}
              value={webhookSecret}
              placeholder={snap.zoho.webhookSecretSet ? "•••• already set" : "Paste from Zoho webhook page"}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <button onClick={saveSecret} disabled={!!webhookSecretError || webhookSecret.length < 8} className="btn-primary disabled:opacity-50">Save secret</button>
          </div>
          {webhookSecretError && <p className="text-xs text-rose-600 mt-1">{webhookSecretError}</p>}
        </label>
      </div>
    </Card>
  );
}

function SmtpSection({ snap, put, test, busy }: any) {
  const [f, setF] = useState({ host: snap.smtp.host, port: snap.smtp.port || 465, secure: !!snap.smtp.secure, user: snap.smtp.user, pass: "", mailFrom: snap.smtp.mailFrom });
  const [testTo, setTestTo] = useState("");
  useEffect(() => {
    setF((p) => ({ ...p, host: snap.smtp.host, port: snap.smtp.port || 465, secure: !!snap.smtp.secure, user: snap.smtp.user, mailFrom: snap.smtp.mailFrom }));
  }, [snap]);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (!f.host.trim()) e.host = "SMTP host is required";
    else if (!isHostname(String(f.host))) e.host = "Host looks invalid";
    const port = Number(f.port);
    if (!port || port < 1 || port > 65535) e.port = "Port must be 1–65535";
    if (!f.user.trim()) e.user = "User is required";
    else if (!isEmail(f.user) && !/^[a-z0-9._-]+$/i.test(f.user)) e.user = "User looks invalid";
    if (!snap.smtp.passSet && !f.pass.trim()) e.pass = "Password is required";
    if (!f.mailFrom.trim()) e.mailFrom = "From address is required";
    return e;
  }, [f, snap.smtp.passSet]);
  const hasErrors = Object.values(errors).some(Boolean);
  const canTest = !!snap.smtp.host && !!snap.smtp.user && snap.smtp.passSet;
  const testToError = testTo && !isEmail(testTo) ? "Invalid email" : null;

  return (
    <Card title="Email — SMTP" status={<StatusPill ok={!!(snap.smtp.host && snap.smtp.user && snap.smtp.passSet)} okLabel="Configured" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Host" required value={f.host} onChange={(v) => setF({ ...f, host: v })} placeholder="smtp.zoho.com" error={errors.host} />
        <Field label="Port" required value={f.port} onChange={(v) => setF({ ...f, port: Number(v) || 0 })} type="number" min={1} max={65535} placeholder="465" error={errors.port} />
        <Field label="User" required value={f.user} onChange={(v) => setF({ ...f, user: v })} placeholder="no-reply@example.com" error={errors.user} />
        <Field label="Password" required alreadySet={snap.smtp.passSet} value={f.pass} onChange={(v) => setF({ ...f, pass: v })} type="password" placeholder={snap.smtp.passSet ? "•••• already set" : ""} error={errors.pass} />
        <Field label="From" required value={f.mailFrom} onChange={(v) => setF({ ...f, mailFrom: v })} placeholder={'"Lexxus" <no-reply@lexxus.com>'} error={errors.mailFrom} />
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" checked={!!f.secure} onChange={(e) => setF({ ...f, secure: e.target.checked })} />
          Secure (TLS on connect — port 465)
        </label>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <button disabled={busy === "smtp" || hasErrors} onClick={() => put("smtp", f, "SMTP")} className="btn-primary disabled:opacity-50">Save</button>
        <input className={`input max-w-[240px] ${testToError ? "border-rose-500" : ""}`} placeholder="your@email.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
        <button disabled={!!testToError || !isEmail(testTo) || busy === "test-smtp" || !canTest} title={!canTest ? "Save SMTP credentials first" : undefined} onClick={() => test("smtp", { to: testTo })} className="btn-outline disabled:opacity-50">
          {busy === "test-smtp" ? "Sending…" : "Send test email"}
        </button>
      </div>
      {testToError && <p className="text-xs text-rose-600">{testToError}</p>}
    </Card>
  );
}

function CloudflareSection({ snap, put, test, busy }: any) {
  const [f, setF] = useState({ accountId: snap.cloudflare.accountId, apiToken: "" });
  useEffect(() => { setF((p) => ({ ...p, accountId: snap.cloudflare.accountId })); }, [snap]);

  // Everything optional here — only require token if you flip from unset→set.
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (f.accountId && !/^[a-f0-9]{24,40}$/i.test(f.accountId)) e.accountId = "Account ID looks invalid";
    return e;
  }, [f]);
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <Card title="Cloudflare (optional)" status={<StatusPill ok={snap.cloudflare.apiTokenSet} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Account ID" value={f.accountId} onChange={(v) => setF({ ...f, accountId: v })} error={errors.accountId} />
        <Field label="API token" alreadySet={snap.cloudflare.apiTokenSet} value={f.apiToken} onChange={(v) => setF({ ...f, apiToken: v })} type="password" placeholder={snap.cloudflare.apiTokenSet ? "•••• already set" : ""} />
      </div>
      <div className="flex gap-2">
        <button disabled={busy === "cloudflare" || hasErrors} onClick={() => put("cloudflare", f, "Cloudflare")} className="btn-primary disabled:opacity-50">Save</button>
        <button disabled={busy === "test-cloudflare" || !snap.cloudflare.apiTokenSet} title={!snap.cloudflare.apiTokenSet ? "Save API token first" : undefined} onClick={() => test("cloudflare")} className="btn-outline disabled:opacity-50">Verify token</button>
      </div>
    </Card>
  );
}

function LimitsSection({ snap, put, busy }: any) {
  const [f, setF] = useState({ ...snap.limits });
  useEffect(() => { setF({ ...snap.limits }); }, [snap]);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (!isPositiveInt(f.downloadTokenTtlDays) || f.downloadTokenTtlDays > 365) e.downloadTokenTtlDays = "1–365";
    if (!isPositiveInt(f.downloadLimitPerOrder) || f.downloadLimitPerOrder > 100) e.downloadLimitPerOrder = "1–100";
    if (!isPositiveInt(f.downloadRateLimitPerHour) || f.downloadRateLimitPerHour > 10000) e.downloadRateLimitPerHour = "1–10000";
    if (!isPositiveInt(f.globalRateLimitPer15Min) || f.globalRateLimitPer15Min > 1_000_000) e.globalRateLimitPer15Min = "1–1000000";
    return e;
  }, [f]);
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <Card title="Download & rate limits">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Download token TTL (days)" required value={f.downloadTokenTtlDays} onChange={(v) => setF({ ...f, downloadTokenTtlDays: Number(v) || 0 })} type="number" min={1} max={365} help="How long a paid order's download link stays valid." error={errors.downloadTokenTtlDays} />
        <Field label="Download limit / order" required value={f.downloadLimitPerOrder} onChange={(v) => setF({ ...f, downloadLimitPerOrder: Number(v) || 0 })} type="number" min={1} max={100} help="Applies to new orders. Existing orders keep their original limit." error={errors.downloadLimitPerOrder} />
        <Field label="Download rate limit / hour / user" required value={f.downloadRateLimitPerHour} onChange={(v) => setF({ ...f, downloadRateLimitPerHour: Number(v) || 0 })} type="number" min={1} max={10000} error={errors.downloadRateLimitPerHour} />
        <Field label="Global rate limit / 15 min / IP" required value={f.globalRateLimitPer15Min} onChange={(v) => setF({ ...f, globalRateLimitPer15Min: Number(v) || 0 })} type="number" min={1} max={1_000_000} error={errors.globalRateLimitPer15Min} />
      </div>
      <button disabled={busy === "limits" || hasErrors} onClick={() => put("limits", f, "Limits")} className="btn-primary disabled:opacity-50">Save</button>
    </Card>
  );
}

function ObservabilitySection({ snap, put, busy }: any) {
  const [dsn, setDsn] = useState("");
  const error = dsn && !isUrl(dsn) ? "DSN must be a URL" : null;
  return (
    <Card title="Observability" status={<StatusPill ok={snap.observability.sentryDsnSet} />}>
      <Field label="Sentry DSN" value={dsn} onChange={setDsn} alreadySet={snap.observability.sentryDsnSet} type="password" placeholder={snap.observability.sentryDsnSet ? "•••• already set — paste to replace" : "https://…@sentry.io/…"} help="Takes effect on next backend restart (Sentry init is boot-time)." error={error} />
      <button disabled={busy === "observability" || !!error} onClick={() => put("observability", { sentryDsn: dsn }, "Sentry DSN")} className="btn-primary disabled:opacity-50">Save</button>
    </Card>
  );
}

/* ─────────── Payment provider toggles ─────────── */

function PaymentProvidersSection({ snap, put, busy }: any) {
  const p = snap.payments || {};
  const [zohoEnabled, setZohoEnabled] = useState<boolean>(!!p.zohoEnabled);
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(!!p.stripeEnabled);
  const [razorpayEnabled, setRazorpayEnabled] = useState<boolean>(!!p.razorpayEnabled);
  const [defaultProvider, setDefaultProvider] = useState<string>(p.defaultProvider || "zoho");

  useEffect(() => {
    setZohoEnabled(!!snap.payments?.zohoEnabled);
    setStripeEnabled(!!snap.payments?.stripeEnabled);
    setRazorpayEnabled(!!snap.payments?.razorpayEnabled);
    setDefaultProvider(snap.payments?.defaultProvider || "zoho");
  }, [snap]);

  const activeCount = [zohoEnabled, stripeEnabled, razorpayEnabled].filter(Boolean).length;

  function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50 cursor-pointer select-none">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-black" : "bg-neutral-300"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </label>
    );
  }

  return (
    <Card title="Payment providers">
      <p className="text-xs text-neutral-500">Enable or disable each gateway. The default provider handles new checkouts. Credentials are managed from the backend <code className="bg-neutral-100 px-1">.env</code> file.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Toggle label="Zoho Payments" checked={zohoEnabled} onChange={setZohoEnabled} />
        <Toggle label="Stripe" checked={stripeEnabled} onChange={setStripeEnabled} />
        <Toggle label="Razorpay" checked={razorpayEnabled} onChange={setRazorpayEnabled} />
      </div>
      <div>
        <label className="block">
          <span className="label">Default provider</span>
          <select
            className="input"
            value={defaultProvider}
            onChange={(e) => setDefaultProvider(e.target.value)}
          >
            {zohoEnabled && <option value="zoho">Zoho Payments</option>}
            {stripeEnabled && <option value="stripe">Stripe</option>}
            {razorpayEnabled && <option value="razorpay">Razorpay</option>}
            {!zohoEnabled && !stripeEnabled && !razorpayEnabled && (
              <option value="" disabled>No provider enabled</option>
            )}
          </select>
          <p className="text-xs text-neutral-500 mt-1">New checkout sessions use this provider.</p>
        </label>
      </div>
      {activeCount === 0 && (
        <p className="text-xs text-rose-600 bg-rose-50 rounded p-2">⚠ No payment provider is enabled — customers cannot check out.</p>
      )}
      <button
        disabled={busy === "payments"}
        onClick={() => put("payments", { zohoEnabled, stripeEnabled, razorpayEnabled, defaultProvider }, "Payment settings")}
        className="btn-primary disabled:opacity-50"
      >
        {busy === "payments" ? "Saving…" : "Save"}
      </button>
    </Card>
  );
}

/* ─────────── Stripe section ─────────── */

function StripeSection({ snap, put, test, busy }: any) {
  const s = snap.stripe || {};
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [currency, setCurrency] = useState(s.currency || "inr");

  useEffect(() => {
    setCurrency(snap.stripe?.currency || "inr");
  }, [snap]);

  const currencyError = currency && !/^[a-z]{3}$/i.test(currency) ? "3-letter ISO code (e.g. inr)" : null;
  const canTest = s.secretKeySet;

  return (
    <Card title="Payments — Stripe" status={<StatusPill ok={s.secretKeySet} okLabel="Key set" offLabel="Not configured" />}>
      <p className="text-xs text-neutral-500">
        Credentials set here are stored in the database and take priority over <code className="bg-neutral-100 px-1">.env</code> values at runtime.
        Leave secret fields blank to keep the current value.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Secret key"
          alreadySet={s.secretKeySet}
          value={secretKey}
          onChange={setSecretKey}
          type="password"
          placeholder={s.secretKeySet ? "•••• already set" : "sk_live_… or sk_test_…"}
          help="Never share this key publicly."
        />
        <Field
          label="Webhook secret"
          alreadySet={s.webhookSecretSet}
          value={webhookSecret}
          onChange={setWebhookSecret}
          type="password"
          placeholder={s.webhookSecretSet ? "•••• already set" : "whsec_…"}
          help={`Webhook URL: /api/payments/webhook/stripe`}
        />
        <label className="block">
          <span className="label">Currency <span className="text-[10px] text-neutral-400 ml-1">3-letter ISO 4217 lowercase</span></span>
          <input className={`input ${currencyError ? "border-rose-500" : ""}`} value={currency} onChange={(e) => setCurrency(e.target.value.toLowerCase())} placeholder="inr" maxLength={3} />
          {currencyError && <p className="text-xs text-rose-600 mt-1">{currencyError}</p>}
        </label>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy === "stripe" || !!currencyError}
          onClick={() => put("stripe", { secretKey: secretKey || undefined, webhookSecret: webhookSecret || undefined, currency }, "Stripe")}
          className="btn-primary disabled:opacity-50"
        >
          {busy === "stripe" ? "Saving…" : "Save"}
        </button>
        <button
          disabled={busy === "test-stripe" || !canTest}
          title={!canTest ? "Save secret key first" : undefined}
          onClick={() => test("stripe")}
          className="btn-outline disabled:opacity-50"
        >
          {busy === "test-stripe" ? "Testing…" : "Verify credentials"}
        </button>
      </div>
    </Card>
  );
}

/* ─────────── Razorpay section ─────────── */

function RazorpaySection({ snap, put, test, busy }: any) {
  const r = snap.razorpay || {};
  const [keyId, setKeyId] = useState(r.keyId || "");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [currency, setCurrency] = useState(r.currency || "INR");

  useEffect(() => {
    setKeyId(snap.razorpay?.keyId || "");
    setCurrency(snap.razorpay?.currency || "INR");
  }, [snap]);

  const currencyError = currency && !/^[a-z]{3}$/i.test(currency) ? "3-letter ISO code (e.g. INR)" : null;
  const canTest = !!r.keyId && r.keySecretSet;

  return (
    <Card title="Payments — Razorpay" status={<StatusPill ok={!!r.keyId && r.keySecretSet} okLabel="Credentials set" offLabel="Not configured" />}>
      <p className="text-xs text-neutral-500">
        Razorpay uses a frontend widget — the public Key ID is sent to the browser (safe).
        The Key Secret stays server-side. Webhook URL: <code className="bg-neutral-100 px-1">/api/payments/webhook/razorpay</code>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Key ID (public)"
          value={keyId}
          onChange={setKeyId}
          placeholder="rzp_live_… or rzp_test_…"
          help="Safe to expose — sent to the browser for the widget."
        />
        <Field
          label="Key Secret"
          alreadySet={r.keySecretSet}
          value={keySecret}
          onChange={setKeySecret}
          type="password"
          placeholder={r.keySecretSet ? "•••• already set" : "Your Razorpay key secret"}
        />
        <Field
          label="Webhook secret"
          alreadySet={r.webhookSecretSet}
          value={webhookSecret}
          onChange={setWebhookSecret}
          type="password"
          placeholder={r.webhookSecretSet ? "•••• already set" : "From Razorpay dashboard → Webhooks"}
        />
        <label className="block">
          <span className="label">Currency <span className="text-[10px] text-neutral-400 ml-1">3-letter ISO 4217 uppercase</span></span>
          <input className={`input ${currencyError ? "border-rose-500" : ""}`} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="INR" maxLength={3} />
          {currencyError && <p className="text-xs text-rose-600 mt-1">{currencyError}</p>}
        </label>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy === "razorpay" || !!currencyError}
          onClick={() => put("razorpay", { keyId: keyId || undefined, keySecret: keySecret || undefined, webhookSecret: webhookSecret || undefined, currency }, "Razorpay")}
          className="btn-primary disabled:opacity-50"
        >
          {busy === "razorpay" ? "Saving…" : "Save"}
        </button>
        <button
          disabled={busy === "test-razorpay" || !canTest}
          title={!canTest ? "Save Key ID + Key Secret first" : undefined}
          onClick={() => test("razorpay")}
          className="btn-outline disabled:opacity-50"
        >
          {busy === "test-razorpay" ? "Testing…" : "Verify credentials"}
        </button>
      </div>
    </Card>
  );
}
