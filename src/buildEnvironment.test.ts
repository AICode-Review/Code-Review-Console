import { describe, expect, it } from "vitest";
import { assertBuildEnvironment } from "../scripts/buildEnvironment";
describe("production build configuration", () => {
  it("refuses a silently unconfigured production artifact", () => { expect(() => assertBuildEnvironment({})).toThrow("Production build configuration missing"); });
  it("requires the API URL even when auth is configured", () => { expect(() => assertBuildEnvironment({ VITE_SUPABASE_URL: "https://example.com", VITE_SUPABASE_ANON_KEY: "public-test-key" })).toThrow("VITE_API_URL"); });
  it("permits a configured build and an explicitly requested CI/demo artifact", () => {
    expect(() => assertBuildEnvironment({ VITE_SUPABASE_URL: "https://example.com", VITE_SUPABASE_ANON_KEY: "public-test-key", VITE_API_URL: "https://api.example.com" })).not.toThrow();
    expect(() => assertBuildEnvironment({ VITE_ALLOW_UNCONFIGURED_BUILD: "true" })).not.toThrow();
  });
});
