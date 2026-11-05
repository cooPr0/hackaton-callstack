import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const shared = fileURLToPath(new URL("../../shared", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@shared": shared },
  },
  server: {
    host: true, // reachable from phones on the LAN
    port: 5173,
    fs: { allow: ["../.."] }, // shared/ lives outside the app root
  },
  preview: { host: true, port: 4173 },
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
