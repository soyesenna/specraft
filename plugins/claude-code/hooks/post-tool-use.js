#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit): 수정 파일의 연관 spec 페이지 포인터를
// additionalContext로 1~2줄 주입한다(페이지 경로만 — 본문 주입 금지).
// 스로틀(10분)·서버 미가용 처리는 proxy 측이며, proxy 부재 시 무출력 fail-open.
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

// Claude Code Edit/Write/MultiEdit 입력은 tool_input.file_path 하나를 가진다.
function extractFilePaths(input) {
  const toolInput = input.tool_input
  if (
    toolInput !== null &&
    typeof toolInput === "object" &&
    typeof toolInput.file_path === "string" &&
    toolInput.file_path !== ""
  ) {
    return [toolInput.file_path]
  }
  return []
}

const input = readHookInput()
const files = extractFilePaths(input)
if (files.length === 0) {
  process.exit(0)
}

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

const lines = []
for (const file of files) {
  const result = spawnSync(
    "specraft-mcp-proxy",
    ["hook", "post-tool-use", "--file", file],
    spawnOptions,
  )
  // proxy 부재(result.error)·실패 시 무출력 fail-open: 안내는 advisory다.
  if (
    !result.error &&
    result.status === 0 &&
    typeof result.stdout === "string" &&
    result.stdout.trim() !== ""
  ) {
    lines.push(result.stdout.trim())
  }
}

if (lines.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: lines.join("\n") },
    }),
  )
}
