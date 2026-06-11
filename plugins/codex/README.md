# specraft Codex plugin

Codex counterpart of the Claude Code plugin: specraft context injection, MCP tools, setup/init skills, and stop gate hooks.

## Contents

- `.codex-plugin/plugin.json` — plugin manifest; points at `./skills/`, `./hooks/hooks.json`, and `./.mcp.json`.
- `.mcp.json` — registers the `specraft` MCP server as `node ./proxy/cli.js` (bundled proxy, resolved against the plugin root via `"cwd": "."`), exposing `specraft_status`, `specraft_query`, `specraft_ingest`, `specraft_defer`, the read tools (`specraft_read_page`/`specraft_tree`/`specraft_history`/`specraft_conflicts`/`specraft_context`), and `specraft_analyze` (drift-review material: changed files + related wiki pages + open questions).
- `hooks/hooks.json` + `hooks/` — five wired events: `SessionStart` (`startup|resume|clear` → `session-start.js` context injection, `compact` → `post-compact.js` re-injection after compaction), `UserPromptSubmit` (`user-prompt-submit.js` pending-replay gate), `PreToolUse` (`Edit|Write|apply_patch` → `pre-tool-use.js` branch-lock warning, 5-minute status cache, fail-open, no blocking), `PostToolUse` (`Edit|Write|apply_patch` → `post-tool-use.js` related spec-page pointers, 10-minute per-file throttle, fail-open), `Stop` (`stop.js` stop gate: dirty worktree, unpushed HEAD, or missing ingest marker blocks ending a write session).
- `skills/` — setup/init plus the spec lifecycle trio: `specraft-spec` (idea → structured spec), `specraft-clarify` (resolve open questions), `specraft-tasks` (spec → task breakdown). All lifecycle output lives in the wiki via `specraft_ingest` — no repo files.
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

## Steering

The wiki page `steering.md` is the project's standing-rules page: durable working agreements (conventions, decision principles, review rules) that should shape every session. The specraft backend automatically includes `steering.md` in the context it injects at session start, so rules recorded there reach every agent without repo files. Record or update it via `specraft_ingest` (e.g. `area: "steering"`); the `specraft-spec` skill reads it before drafting new specs.

## Configuration

- `.specraft.json` in the project root: `server_url`, `strict_mode`.
- `~/.specraft/credentials` (0600) or `SPECRAFT_SERVER_URL` / `SPECRAFT_API_KEY` environment variables for the MCP proxy.
- TLS: a non-localhost `http://` server URL is rejected by default — use `https://` or set `SPECRAFT_ALLOW_INSECURE_HTTP=1` to bypass explicitly. Loopback (`127.0.0.1`/`localhost`/`[::1]`) stays allowed.
