# @specraft/mcp-proxy

Specraft MCP stdio proxy. Exposes branch-aware spec wiki tools (`specraft_query`,
`specraft_ingest`, `specraft_status`, `specraft_defer`) and powers the plugin hooks
(`hook session-start|user-prompt-submit|stop|context`) for Claude Code and Codex.

Ships as a single-file ESM bundle (`dist-bundle/cli.js`) with `@specraft/shared` and all
runtime dependencies inlined. The same artifact is committed to `plugins/*/proxy/cli.js`
for marketplace installs (ADR-1 dual distribution).

## Install

```sh
npm install -g @specraft/mcp-proxy
specraft-mcp-proxy --version
```

## Configuration

- API key: `SPECRAFT_API_KEY` env → `CLAUDE_PLUGIN_OPTION_API_KEY` (Claude Code plugin
  userConfig) → `~/.specraft/credentials`.
- Server URL: `SPECRAFT_SERVER_URL` env → `.specraft.json` (`server_url`) →
  `~/.specraft/credentials` → `http://127.0.0.1:4311`.

`~/.specraft/credentials` is a dotenv-style `KEY=VALUE` file (`SPECRAFT_API_KEY=...`,
optionally `SPECRAFT_SERVER_URL=...`). Keep it at mode `0600`; the proxy warns on stderr
otherwise.

## Build

`pnpm build` runs `tsc` (typecheck/dist), `tsup` (single-file bundle into `dist-bundle/`),
and `scripts/copy-bundle.mjs` (refreshes the committed `plugins/*/proxy/` copies).
