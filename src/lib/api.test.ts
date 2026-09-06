import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules(); // api.ts reads import.meta.env.VITE_API_URL once at module scope.
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function freshApiLib() {
  return import("./api.js");
}

describe("apiUrl / apiConfigured", () => {
  it("throws a clear, specific error instead of silently defaulting to localhost when VITE_API_URL is unset", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { apiUrl, apiConfigured } = await freshApiLib();
    expect(apiConfigured()).toBe(false);
    expect(() => apiUrl("/api/admin/overview")).toThrow(/VITE_API_URL is not configured/);
  });

  it("builds the full URL correctly when VITE_API_URL is set", async () => {
    vi.stubEnv("VITE_API_URL", "https://code-review-backend-jzb0.onrender.com/");
    const { apiUrl, apiConfigured } = await freshApiLib();
    expect(apiConfigured()).toBe(true);
    expect(apiUrl("/api/admin/overview")).toBe("https://code-review-backend-jzb0.onrender.com/api/admin/overview");
    expect(apiUrl("api/admin/orgs")).toBe("https://code-review-backend-jzb0.onrender.com/api/admin/orgs");
  });
});
