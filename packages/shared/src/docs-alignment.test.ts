/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

function readText(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8")
}

function expectContains(relativePath: string, snippets: readonly string[]): void {
  const text = readText(relativePath)
  for (const snippet of snippets) {
    expect(text, `${relativePath} must contain ${snippet}`).toContain(snippet)
  }
}

function expectNotContains(relativePath: string, snippets: readonly string[]): void {
  const text = readText(relativePath)
  for (const snippet of snippets) {
    expect(text, `${relativePath} must not contain ${snippet}`).not.toContain(snippet)
  }
}

describe("latest external docs alignment", () => {
  it("keeps internal spec and plan aligned with current Claude/Codex/OpenRouter docs", () => {
    expectContains("_docs/external/claude-code/06-hooks.md", [
      "8회 연속 차단 후 훅을 오버라이드",
      "background_tasks",
      "session_crons",
    ])
    expectContains("_docs/external/claude-code/04-plugins.md", [
      "매니페스트는 선택 사항",
      "단일 스킬 플러그인",
    ])
    expectContains("_docs/external/codex/06-hooks.md", [
      "UserPromptSubmit",
      "matcher는 무시됨",
      "reason",
    ])
    expectContains("_docs/external/openrouter/22-responses-api.md", [
      "Responses API Beta",
      "기존 Chat Completions 기반 프로젝트는 변경 없이 계속 사용할 수 있습니다",
    ])

    expectContains("_docs/internal/v1/deep-interview-specraft.md", [
      "CLAUDE_CODE_STOP_HOOK_BLOCK_CAP",
      "background_tasks",
      "session_crons",
      "Claude Code 매니페스트는 선택 사항",
      "Codex의 UserPromptSubmit/Stop 이벤트는 지원되며 matcher는 무시됨",
      "Responses API Beta",
    ])
    expectContains("_docs/internal/v1/ralplan-specraft-v1.md", [
      "CLAUDE_CODE_STOP_HOOK_BLOCK_CAP",
      "background_tasks",
      "session_crons",
      "Claude Code 매니페스트는 선택 사항",
      "Codex의 UserPromptSubmit/Stop 이벤트는 지원되며 matcher는 무시됨",
      "Responses API Beta",
      "packages/shared production은 REST/Zod/API client 전용",
    ])
    expectContains("_docs/internal/v1/m1-implementation-evidence.md", [
      "packages/shared production은 REST/Zod/API client 전용",
      "hook I/O·capability는 M0.5 검증 산출물",
      "M7/M8 어댑터 입력",
    ])
    expectNotContains("_docs/internal/v1/deep-interview-specraft.md", [
      "continuePrompt",
      "decision: deny",
      "13개 문서",
    ])
    expectNotContains("_docs/internal/v1/ralplan-specraft-v1.md", [
      "continuePrompt",
      "decision: deny",
      "13개 문서",
    ])
    expect(existsSync(resolve(repoRoot, "packages/shared/src/schema-hooks.ts"))).toBe(false)
    for (const staleDistPath of [
      "packages/shared/dist/schema-hooks.js",
      "packages/shared/dist/schema-hooks.js.map",
      "packages/shared/dist/schema-hooks.d.ts",
      "packages/shared/dist/schema-hooks.d.ts.map",
    ]) {
      expect(existsSync(resolve(repoRoot, staleDistPath)), `${staleDistPath} must not exist`).toBe(
        false,
      )
    }
    expectNotContains("packages/shared/src/schemas.ts", ["schema-hooks"])
    if (existsSync(resolve(repoRoot, "packages/shared/dist/schemas.js"))) {
      expectNotContains("packages/shared/dist/schemas.js", ["schema-hooks"])
    }
    for (const relativePath of [
      "packages/shared/src/schema-contracts.ts",
      "packages/shared/src/schema-foundation.ts",
      "packages/shared/src/client.ts",
      "packages/shared/src/client-core.ts",
      "packages/shared/src/index.ts",
    ]) {
      expectNotContains(relativePath, [
        "SessionStartHookInput",
        "PostCompactHookInput",
        "UserPromptSubmitHookInput",
        "StopHookInput",
        "HookCapabilityMatrix",
      ])
    }
  })
})
