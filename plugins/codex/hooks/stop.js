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

// Codex Stop 출력 분기: block 형식({decision:"block",reason})은 Claude Code와 동일하지만,
// Codex Stop은 종료 코드 0에서 JSON만 허용하고 decision:"approve"는 미문서(파싱 실패 시 훅 실패로 보고)다.
// 허용 경로의 정본은 "출력 없음 + exit 0"이므로 proxy의 approve 출력을 무출력으로 정규화한다.
// (_docs/external/codex/06-hooks.md §10.10, §9.2)
function relayDecision(stdoutText) {
  try {
    const parsed = JSON.parse(stdoutText)
    if (parsed !== null && typeof parsed === "object" && parsed.decision === "block") {
      writeBlock(
        typeof parsed.reason === "string" && parsed.reason !== ""
          ? parsed.reason
          : resolutionGuidance,
      )
      return
    }
    // allow/approve: 출력 없음 = 성공으로 처리되어 종료가 허용된다.
  } catch {
    writeBlock(`specraft stop gate returned malformed output — ${resolutionGuidance}`)
  }
}

if (result.error) {
  writeBlock(`${installGuidance} ${resolutionGuidance}`)
} else if (
  result.status === 0 &&
  typeof result.stdout === "string" &&
  result.stdout.trim() !== ""
) {
  relayDecision(result.stdout.trim())
} else {
  const stderrText = typeof result.stderr === "string" ? result.stderr.trim() : ""
  writeBlock(`${stderrText || "specraft stop gate failed to run"} — ${resolutionGuidance}`)
}
