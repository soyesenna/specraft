#!/usr/bin/env node
// PreToolUse(Edit|Write|apply_patch alias): 현재 브랜치가 서버 branch_locks에
// 잠겨 있으면 systemMessage로 경고 1줄을 표시한다. 차단하지 않는다 —
// Codex의 permissionDecision "ask"는 파싱만 되고 훅 실패로 처리된다
// (_docs/external/codex/06-hooks.md §10.3). status 5분 캐시는 proxy 측이며,
// proxy 부재 시 무출력 fail-open.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

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
const spawnOptions = {
  encoding: "utf8",
  env,
  stdio: ["ignore", "pipe", "pipe"],
}
if (typeof input.cwd === "string" && input.cwd !== "") {
  spawnOptions.cwd = input.cwd
}

const result = spawnSync("specraft-mcp-proxy", ["hook", "pre-tool-use"], spawnOptions)

// proxy 부재(result.error)·실패 시 무출력 fail-open: 잠금 경고는 advisory다.
if (
  !result.error &&
  result.status === 0 &&
  typeof result.stdout === "string" &&
  result.stdout.trim() !== ""
) {
  process.stdout.write(JSON.stringify({ systemMessage: result.stdout.trim() }))
}
