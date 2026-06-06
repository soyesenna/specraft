import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@specraft/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
})
