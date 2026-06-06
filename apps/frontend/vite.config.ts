import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: process.env["SPECRAFT_DEV_API_TARGET"] ?? "http://127.0.0.1:4174",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@specraft/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
})
