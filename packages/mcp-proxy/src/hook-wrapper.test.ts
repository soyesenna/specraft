import { type SpawnSyncReturns, spawnSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

function hookPath(plugin: "claude-code" | "codex", name: string): string {
  return fileURLToPath(new URL(`../../../plugins/${plugin}/hooks/${name}`, import.meta.url))
}

function runHook(
  plugin: "claude-code" | "codex",
  name: string,
  stdin: string,
): SpawnSyncReturns<string> {
  const emptyPath = mkdtempSync(join(tmpdir(), "specraft-empty-path-"))
  return spawnSync(process.execPath, [hookPath(plugin, name)], {
    encoding: "utf8",
    env: { HOME: mkdtempSync(join(tmpdir(), "specraft-hook-home-")), PATH: emptyPath },
    input: stdin,
  })
}

function hookStdin(): string {
  return JSON.stringify({
    session_id: "hook-test-session",
    stop_hook_active: false,
    cwd: mkdtempSync(join(tmpdir(), "specraft-hook-cwd-")),
    hook_event_name: "Stop",
  })
}

describe("hook wrappers survive a missing specraft-mcp-proxy (ENOENT guard)", () => {
  it.each([
    "claude-code",
    "codex",
  ] as const)("%s stop.js emits a block decision with install guidance instead of crashing", (plugin) => {
    const result = runHook(plugin, "stop.js", hookStdin())
    expect(result.status).toBe(0)
    expect(result.stderr).not.toContain("TypeError")
    const output = JSON.parse(result.stdout) as { decision: string; reason: string }
    expect(output.decision).toBe("block")
    expect(output.reason).toContain("specraft-mcp-proxy가 설치되지 않았습니다")
    expect(output.reason).toContain("specraft_defer")
    expect(output.reason).toContain("strict_mode=false")
  })

  it.each([
    "claude-code",
    "codex",
  ] as const)("%s user-prompt-submit.js emits a block decision with install guidance", (plugin) => {
    const result = runHook(plugin, "user-prompt-submit.js", hookStdin())
    expect(result.status).toBe(0)
    const output = JSON.parse(result.stdout) as { decision: string; reason: string }
    expect(output.decision).toBe("block")
    expect(output.reason).toContain("specraft-mcp-proxy가 설치되지 않았습니다")
  })

  it.each([
    "claude-code",
    "codex",
  ] as const)("%s session-start.js fails open with install guidance text", (plugin) => {
    const result = runHook(plugin, "session-start.js", hookStdin())
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("specraft-mcp-proxy가 설치되지 않았습니다")
  })

  it.each([
    "claude-code",
    "codex",
  ] as const)("%s post-compact.js fails open with install guidance text", (plugin) => {
    const result = runHook(plugin, "post-compact.js", hookStdin())
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("specraft-mcp-proxy가 설치되지 않았습니다")
  })

  it("tolerates empty and malformed stdin without crashing", () => {
    for (const stdin of ["", "not json", "[1,2,3]"]) {
      const result = runHook("claude-code", "stop.js", stdin)
      expect(result.status).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({ decision: "block" })
    }
  })

  // M4+ drift 훅은 advisory다: proxy 부재 시 block이 아니라 "무출력 fail-open"이 계약.
  it.each([
    "claude-code",
    "codex",
  ] as const)("%s post-tool-use.js stays silent (fail-open) without the proxy", (plugin) => {
    const stdin = JSON.stringify({
      session_id: "hook-test-session",
      cwd: mkdtempSync(join(tmpdir(), "specraft-hook-cwd-")),
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/some/file.ts" },
    })
    const result = runHook(plugin, "post-tool-use.js", stdin)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe("")
  })

  it.each([
    "claude-code",
    "codex",
  ] as const)("%s pre-tool-use.js stays silent (fail-open) without the proxy", (plugin) => {
    const stdin = JSON.stringify({
      session_id: "hook-test-session",
      cwd: mkdtempSync(join(tmpdir(), "specraft-hook-cwd-")),
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: "/tmp/some/file.ts" },
    })
    const result = runHook(plugin, "pre-tool-use.js", stdin)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe("")
  })

  it("post-tool-use.js exits quietly when no file path can be extracted", () => {
    for (const stdin of ["", "{}", JSON.stringify({ tool_input: { command: "ls" } })]) {
      const result = runHook("claude-code", "post-tool-use.js", stdin)
      expect(result.status).toBe(0)
      expect(result.stdout).toBe("")
    }
  })

  it("codex post-tool-use.js extracts apply_patch file paths from the patch body", () => {
    // proxy가 PATH에 없으므로 출력은 없어야 하지만, 패치 파싱 경로가 크래시 없이
    // 통과하는지(ENOENT fail-open) 검증한다.
    const stdin = JSON.stringify({
      cwd: mkdtempSync(join(tmpdir(), "specraft-hook-cwd-")),
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: src/auth/login.ts\n@@\n-a\n+b\n*** Add File: docs/auth.md\n+hello\n*** End Patch",
      },
    })
    const result = runHook("codex", "post-tool-use.js", stdin)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe("")
    expect(result.stderr).not.toContain("TypeError")
  })
})
