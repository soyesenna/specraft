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
})
