# specraft Codex plugin

Codex counterpart of the Claude Code plugin: specraft context injection, MCP tools, setup/init skills, and stop gate hooks.

## Contents

- `.codex-plugin/plugin.json` — plugin manifest; points at `./skills/`, `./hooks/hooks.json`, and `./.mcp.json`.
- `.mcp.json` — registers the `specraft` MCP server as `node ./proxy/cli.js` (bundled proxy, resolved against the plugin root via `"cwd": "."`), exposing `specraft_status`, `specraft_query`, `specraft_ingest`, and `specraft_defer`.
- `hooks/hooks.json` + `hooks/` — three wired events: `SessionStart` (`startup|resume|clear` → `session-start.js` context injection, `compact` → `post-compact.js` re-injection after compaction), `UserPromptSubmit` (`user-prompt-submit.js` pending-replay gate), `Stop` (`stop.js` stop gate: dirty worktree, unpushed HEAD, or missing ingest marker blocks ending a write session).
- `skills/specraft-setup/`, `skills/specraft-init/` — setup and init skills.
- `scripts/install-global-hooks.mjs` — installs the hooks at the user level (`~/.codex/hooks.json`) for Codex setups that do not load plugin hooks (openai/codex#16430).

## Install

This repo ships a Codex marketplace manifest at `.agents/plugins/marketplace.json` whose `specraft` entry points to this directory.

```sh
codex plugin marketplace add <path-or-git-url-of-this-repo>
codex plugin add specraft@specraft
```

### Hooks

Plugin-level hooks require the `plugin_hooks` feature in `~/.codex/config.toml`:

```toml
[features]
plugins = true
plugin_hooks = true
```

If your Codex version does not load plugin hooks (openai/codex#16430), install them at the user level instead:

```sh
node plugins/codex/scripts/install-global-hooks.mjs           # install (idempotent merge into ~/.codex/hooks.json)
node plugins/codex/scripts/install-global-hooks.mjs --remove  # uninstall specraft entries only
```

The script preserves unrelated entries in `~/.codex/hooks.json`, replaces previous specraft entries on re-run, and honors `CODEX_HOME`. Do not combine both paths (plugin hooks + global hooks) — the hooks would run twice; the installer warns when `plugin_hooks = true` is detected.

Notes:

- New or changed hooks must pass Codex's trust review on the next interactive session before they execute (`hooks.state` entries in `config.toml`).
- As of codex-cli 0.137.0, hooks were observed to fire in interactive sessions only; `codex exec` runs did not execute SessionStart/Stop hooks.

## Configuration

- `.specraft.json` in the project root: `server_url`, `strict_mode`.
- `~/.specraft/credentials` (0600) or `SPECRAFT_SERVER_URL` / `SPECRAFT_API_KEY` environment variables for the MCP proxy.
