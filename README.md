# specraft

specraft is a single-project spec source server for AI-driven development teams. It keeps the wiki in `wiki.git`, operational state in SQLite, and exposes REST plus MCP tools for Claude Code and Codex.

## Local Setup

```sh
pnpm install
pnpm --filter @specraft/shared build
pnpm --filter @specraft/backend build
SPECRAFT_SECRET="replace-with-32-plus-random-chars" pnpm --filter @specraft/backend dev
```

`SPECRAFT_SECRET` is required. The server derives the session-cookie key and the credential-encryption key from it. Losing this secret means encrypted git credentials cannot be decrypted and must be re-entered by an admin.

## Docker

```sh
export SPECRAFT_SECRET="$(openssl rand -base64 48)"
docker compose up --build
```

The compose stack stores `/data/specraft.db`, `/data/wiki.git`, `/data/code-mirror.git`, and temporary wiki worktrees in the `specraft-data` volume.

## Onboarding

1. Start the server.
2. Call `POST /api/v1/auth/bootstrap-admin` once to create the first admin.
3. Create invites with `POST /api/v1/admin/invites`.
4. Members create API keys with `POST /api/v1/keys`; keys are shown once, stored hashed, and used as `Authorization: Bearer sk-spcrft-...`.
5. Configure agents with `.specraft.json`:

```json
{
  "server_url": "http://127.0.0.1:4311",
  "strict_mode": true
}
```

## Plugins

- `packages/mcp-proxy` exposes `specraft_status`, `specraft_query`, and `specraft_ingest` style behavior through the shared REST client.
- `plugins/claude-code` contains Claude Code metadata, hooks, MCP registration, `/specraft-setup`, and `/specraft-init`.
- `plugins/codex` contains the Codex `.codex-plugin` manifest, matcher-free hooks, and setup/init skills.

Stop gates are hard by default: dirty worktree, unpushed HEAD, or missing ingest marker blocks ending a write session. Read-only sessions are exempt.

## Backup And Recovery

Back up the Docker volume or these files as a unit:

```sh
docker run --rm -v specraft_specraft-data:/data -v "$PWD/backups:/backup" alpine \
  tar czf /backup/specraft-data.tgz -C /data .
```

Restore by stopping the server, replacing the volume contents from the archive, and starting the server again. On startup the backend runs `git fsck` on `wiki.git` and verifies the required skeleton files: `overview.md`, `index.md`, and `log.md`. If this check fails, restore the last known-good volume snapshot or repair `wiki.git` before accepting new ingest requests.

## Demo Scenario

1. Bootstrap admin and create a member invite.
2. Create a member API key.
3. Call `POST /api/v1/context` for `main`.
4. Call `POST /api/v1/ingest` with the pushed HEAD summary.
5. Call `POST /api/v1/query`; verify citations reference wiki pages.
6. Call `GET /api/v1/logs/ingests` and `GET /api/v1/wiki/main/page?path=log.md` to verify authorship and wiki history.
