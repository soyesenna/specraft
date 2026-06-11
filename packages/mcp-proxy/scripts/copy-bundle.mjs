#!/usr/bin/env node
// Copies the tsup single-file bundle into the plugin directories. The copies are
// committed to git on purpose: marketplace installs receive the repo contents as-is,
// so plugins/*/proxy/cli.js must always match packages/mcp-proxy/dist-bundle/cli.js.
import { chmodSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url))
const source = join(packageRoot, "dist-bundle", "cli.js")

if (!existsSync(source)) {
  process.stderr.write(`copy-bundle: ${source} not found — run tsup first\n`)
  process.exit(1)
}

for (const plugin of ["claude-code", "codex"]) {
  const proxyDir = join(repoRoot, "plugins", plugin, "proxy")
  mkdirSync(proxyDir, { recursive: true })
  const target = join(proxyDir, "cli.js")
  copyFileSync(source, target)
  chmodSync(target, 0o755)
  // Plugin dirs are installed standalone (outside this monorepo), so without this
  // marker Node would parse the ESM bundle as CommonJS and fail on `import`.
  writeFileSync(join(proxyDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`)
  process.stdout.write(`copy-bundle: dist-bundle/cli.js -> plugins/${plugin}/proxy/cli.js\n`)
}
