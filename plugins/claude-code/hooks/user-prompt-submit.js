#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const hookCommand = "hook user-prompt-submit"
const installGuidance =
  "specraft-mcp-proxy가 설치되지 않았습니다. `npm install -g @specraft/mcp-proxy`로 설치한 뒤 다시 시도하세요."

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

function writeBlock(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }))
}

if (result.error) {
  writeBlock(installGuidance)
} else if (
  result.status === 0 &&
  typeof result.stdout === "string" &&
  result.stdout.trim() !== ""
) {
  process.stdout.write(result.stdout)
} else {
  const stderrText = typeof result.stderr === "string" ? result.stderr.trim() : ""
  writeBlock(stderrText || "specraft prompt gate failed to run")
}
