# specraft Claude Code plugin

Connects Claude Code sessions to a specraft server: spec context in, session summaries out, with hard stop gates in between.

## Contents

- `.claude-plugin/plugin.json` — standard plugin manifest.
- `.mcp.json` — registers the `specraft` MCP server (`specraft-mcp-proxy`) exposing `specraft_status`, `specraft_query`, and `specraft_ingest`.
- `hooks/hooks.json` — hook wiring:
  - `SessionStart` (`startup|resume|clear`) → `hooks/session-start.js` injects specraft project context.
  - `SessionStart` (`compact`) → `hooks/post-compact.js` re-injects context after compaction.
  - `UserPromptSubmit` → `hooks/user-prompt-submit.js` adds prompt-time guidance.
  - `Stop` → `hooks/stop.js` enforces the stop gate: dirty worktree, unpushed HEAD, or missing ingest marker blocks ending a write session.
- `commands/specraft-setup.md`, `commands/specraft-init.md` — `/specraft-setup` and `/specraft-init` slash commands.
- `SKILL.md` — usage guidance for the model.

## Install

From the repo-root marketplace (`.claude-plugin/marketplace.json`):

```
/plugin marketplace add soyesenna/specraft
/plugin install specraft@specraft
```

Or load directly for development: `claude --plugin-dir ./plugins/claude-code`.

## Configuration

- `.specraft.json` in the project root: `server_url`, `strict_mode`.
- `SPECRAFT_SERVER_URL` / `SPECRAFT_API_KEY` environment variables for the MCP proxy.
