#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const hookCommand = "hook stop"
const installGuidance =
  "specraft-mcp-proxy가 설치되지 않았습니다. `npm install -g @specraft/mcp-proxy`로 설치한 뒤 다시 시도하세요."
const resolutionGuidance =
  "해소: 변경을 commit+push 후 specraft_ingest를 실행하거나, specraft_defer 도구로 사유를 기록해 1회 종료를 허용하거나, .specraft.json에 strict_mode=false를 설정하세요."

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

// stop_hook_active=true여도 자동 allow하지 않는다(ADR-3): block을 유지하고 해소 절차를 안내한다.
function writeBlock(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }))
}

if (result.error) {
  writeBlock(`${installGuidance} ${resolutionGuidance}`)
} else if (result.status === 0 && typeof result.stdout === "string" && result.stdout.trim() !== "") {
  process.stdout.write(result.stdout)
} else {
  const stderrText = typeof result.stderr === "string" ? result.stderr.trim() : ""
  writeBlock(`${stderrText || "specraft stop gate failed to run"} — ${resolutionGuidance}`)
}
