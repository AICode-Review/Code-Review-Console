import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initMock = vi.fn();
const captureExceptionMock = vi.fn();
vi.mock("@sentry/react", () => ({
  init: (...args: unknown[]) => initMock(...args),
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

beforeEach(() => {
  vi.unstubAllEnvs();
  initMock.mockReset();
  captureExceptionMock.mockReset();
  vi.resetModules(); // sentry.ts tracks `initialized` at module scope.
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function freshSentryLib() {
  return import("./sentry.js");
}

describe("console sentry wiring", () => {
  it("is a no-op when VITE_SENTRY_DSN is unset — never calls Sentry.init, captureError drops silently", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const { initSentry, captureError } = await freshSentryLib();
    initSentry();
    expect(initMock).not.toHaveBeenCalled();
    expect(() => captureError(new Error("boom"))).not.toThrow();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("initializes once and forwards errors to Sentry when VITE_SENTRY_DSN is set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example.ingest.sentry.io/1");
    const { initSentry, captureError } = await freshSentryLib();
    initSentry();
    initSentry(); // idempotent — a second call must not re-init
    expect(initMock).toHaveBeenCalledTimes(1);

    const err = new Error("boom");
    captureError(err, { scope: "app" });
    expect(captureExceptionMock).toHaveBeenCalledWith(err, { extra: { scope: "app" } });
  });
});
