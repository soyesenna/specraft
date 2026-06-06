import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@specraft/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    exclude: ["dist/**", "dist-types/**", "node_modules/**"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
    globals: true,
  },
})
