/**
 * Admin Sentry hook — same stub pattern as the customer storefront.
 * Activate by installing `@sentry/nextjs` and replacing the TODO
 * block inside `initSentry()`.
 */

let inited = false;

export async function initSentry(): Promise<void> {
  if (inited) return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  // TODO(sentry): install `@sentry/nextjs` then replace this block:
  //
  //   import * as Sentry from "@sentry/nextjs";
  //   Sentry.init({
  //     dsn,
  //     environment: process.env.NODE_ENV,
  //     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  //   });
  //
  // eslint-disable-next-line no-console
  console.info("[sentry] DSN set but SDK not installed — skipping init");
  inited = true;
}

export async function captureError(
  _err: unknown,
  _extra?: Record<string, unknown>,
): Promise<void> {
  // Becomes `Sentry.captureException(err, { extra })` once the SDK is wired.
}
