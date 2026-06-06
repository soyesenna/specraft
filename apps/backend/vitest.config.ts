import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@specraft/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    testTimeout: 30_000,
  },
})
