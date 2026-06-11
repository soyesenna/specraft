# specraft Codex plugin

Codex counterpart of the Claude Code plugin: specraft context injection, MCP tools, setup/init skills, and stop gate hooks.

## Contents

- `.codex-plugin/plugin.json` — plugin manifest; registers the `specraft` MCP server (`specraft-mcp-proxy`) exposing `specraft_status`, `specraft_query`, and `specraft_ingest`.
- `hooks.json` + `hooks/` — four hooks: `session-start.js` (context injection), `post-compact.js` (re-injection after compaction), `user-prompt-submit.js` (prompt-time guidance), `stop.js` (stop gate: dirty worktree, unpushed HEAD, or missing ingest marker blocks ending a write session).
- `skills/specraft-setup/`, `skills/specraft-init/` — setup and init skills.

## Install

This repo ships a Codex marketplace manifest at `.agents/plugins/marketplace.json` whose `specraft` entry points to this directory.

Note: Codex does not load plugin hooks yet (openai/codex#16430). A global-hooks install script that wires these hooks at the user level is planned for a later milestone and will be documented here once it lands.

## Configuration

- `.specraft.json` in the project root: `server_url`, `strict_mode`.
- `SPECRAFT_SERVER_URL` / `SPECRAFT_API_KEY` environment variables for the MCP proxy.
