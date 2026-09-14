import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { assertBuildEnvironment } from "./scripts/buildEnvironment";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  if (command === "build")
    assertBuildEnvironment({
      ...loadEnv(mode, process.cwd(), "VITE_"),
      ...process.env,
    });
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5174 },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/testSetup.ts"],
      env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" },
    },
  };
});
