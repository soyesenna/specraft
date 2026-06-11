import { readFileSync } from "node:fs"

import { defineConfig } from "tsup"

const PackageManifest = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string }

// ADR-1: single-file dual distribution. @specraft/shared (workspace-private) and all
// runtime deps are inlined so the same artifact works as the npm bin and as the
// committed plugins/*/proxy/cli.js bundle. Node builtins stay external.
export default defineConfig({
  banner: {
    js: [
      "#!/usr/bin/env node",
      'import { createRequire as __specraftCreateRequire } from "node:module";',
      "const require = __specraftCreateRequire(import.meta.url);",
    ].join("\n"),
  },
  clean: true,
  define: {
    __SPECRAFT_PROXY_VERSION__: JSON.stringify(PackageManifest.version),
  },
  dts: false,
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  minify: false,
  noExternal: [/.*/],
  outDir: "dist-bundle",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node20",
  treeshake: true,
})
