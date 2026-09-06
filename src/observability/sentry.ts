import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Browser-side error reporting for the platform admin console — the backend has had Sentry
 * wired since early on (backend/src/observability/sentry.ts), but a real client-side crash
 * here (React render error, event-handler throw, unhandled promise rejection while an admin
 * is suspending an org or changing billing) previously only ever produced a local toast/
 * console.error — gone the moment the tab closed, with no trace anywhere the team could see.
 * Same silent-degrade pattern as the backend and as SMTP/Razorpay: no-op when
 * VITE_SENTRY_DSN is unset, never throws, never blocks rendering.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || initialized) return;
  Sentry.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0 });
  initialized = true;
}

/** Safe to call unconditionally — a no-op Sentry client just drops the event. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
