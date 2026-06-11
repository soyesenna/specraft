#!/usr/bin/env node
// PostToolUse(Edit|Write|apply_patch alias): 수정 파일의 연관 spec 페이지 포인터를
// additionalContext로 1~2줄 주입한다(페이지 경로만 — 본문 주입 금지).
// Codex의 파일 편집은 apply_patch로 보고되며 tool_input.command가 패치 본문이다
// (_docs/external/codex/06-hooks.md §10.5). 스로틀(10분)·서버 미가용 처리는
// proxy 측이며, proxy 부재 시 무출력 fail-open.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const MAX_FILES_PER_PATCH = 3

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

// apply_patch 본문에서 "*** Add|Update|Delete File: <path>" 줄을 추출한다.
function filesFromPatch(command) {
  const files = []
  for (const match of command.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)) {
    const path = match[1].trim()
    if (path !== "" && !files.includes(path)) {
      files.push(path)
    }
  }
  return files
}

function extractFilePaths(input) {
  const toolInput = input.tool_input
  if (toolInput === null || typeof toolInput !== "object") {
    return []
  }
  if (typeof toolInput.file_path === "string" && toolInput.file_path !== "") {
    return [toolInput.file_path]
  }
  if (input.tool_name === "apply_patch" && typeof toolInput.command === "string") {
    return filesFromPatch(toolInput.command)
  }
  return []
}

const input = readHookInput()
const files = extractFilePaths(input).slice(0, MAX_FILES_PER_PATCH)
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
