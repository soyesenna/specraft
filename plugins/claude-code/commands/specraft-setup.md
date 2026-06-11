---
description: Configure the specraft server URL and API key, writing .specraft.json and storing credentials privately
---

# /specraft-setup

Ask for the specraft server URL and API key, then:

1. Write `.specraft.json` in the repository root with `server_url` and `strict_mode: true`.
2. Store the API key outside git in `~/.specraft/credentials` using the dotenv-style `KEY=VALUE` format (one entry per line, `#` comments allowed):

   ```
   SPECRAFT_API_KEY=<api key>
   ```

   `SPECRAFT_SERVER_URL=<url>` may also be added there as a user-level fallback for repositories without `.specraft.json`.
3. Restrict the file permissions: `chmod 600 ~/.specraft/credentials` (the proxy warns on stderr otherwise).

Resolution order used by the proxy:

- API key: `SPECRAFT_API_KEY` env → plugin userConfig (`CLAUDE_PLUGIN_OPTION_API_KEY`) → `~/.specraft/credentials`.
- Server URL: `SPECRAFT_SERVER_URL` env → `.specraft.json` → `~/.specraft/credentials` → `http://127.0.0.1:4311`.
