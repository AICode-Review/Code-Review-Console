export function assertBuildEnvironment(values: Record<string, string | undefined>): void {
  if (values.VITE_ALLOW_UNCONFIGURED_BUILD === "true") return;
  const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_API_URL"].filter(key => !values[key]?.trim());
  if (missing.length) throw new Error("Production build configuration missing: " + missing.join(", ") + ". Configure these values, or explicitly set VITE_ALLOW_UNCONFIGURED_BUILD=true for a local demo/CI artifact.");
}
