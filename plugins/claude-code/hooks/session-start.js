#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const hookCommand = "hook session-start"
const installGuidance =
  "specraft-mcp-proxy가 설치되지 않았습니다. `npm install -g @specraft/mcp-proxy`로 설치하면 specraft 컨텍스트 주입이 활성화됩니다.\n"
const fallbackGuidance =
  "Specraft context unavailable - configure SPECRAFT_API_KEY (env, plugin config, or ~/.specraft/credentials) and SPECRAFT_SERVER_URL (env or .specraft.json), then restart the session.\n"

function readHookInput() {
  try {
    if (process.stdin.isTTY) {
      return {}
    }
    const parsed = JSON.parse(readFileSync(0, "utf8"))
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const input = readHookInput()
const env = { ...process.env }
if (typeof input.session_id === "string" && input.session_id !== "") {
  env.SPECRAFT_SESSION_ID = input.session_id
}
if (typeof input.stop_hook_active === "boolean") {
  env.SPECRAFT_STOP_HOOK_ACTIVE = String(input.stop_hook_active)
}
const spawnOptions = {
  encoding: "utf8",
  env,
  stdio: ["ignore", "pipe", "pipe"],
}
if (typeof input.cwd === "string" && input.cwd !== "") {
  spawnOptions.cwd = input.cwd
}

const result = spawnSync("specraft-mcp-proxy", hookCommand.split(" "), spawnOptions)

if (result.error) {
  process.stdout.write(installGuidance)
} else if (
  result.status === 0 &&
  typeof result.stdout === "string" &&
  result.stdout.trim() !== ""
) {
  process.stdout.write(result.stdout)
} else {
  process.stdout.write(fallbackGuidance)
}
