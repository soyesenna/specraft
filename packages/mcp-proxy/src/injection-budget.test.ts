// M3.6 — 주입 예산 헬퍼 검증: 토큰 추정, 폴백 절단(index 우선 보존), 주입 본문 렌더링.
import { describe, expect, it } from "vitest"

import {
  estimateTokens,
  FALLBACK_MAX_TOKENS,
  fitContextForInjection,
  INJECTION_BUDGET_TOKENS,
  renderContextInjection,
  TRUNCATION_NOTE,
} from "./injection-budget.js"

describe("estimateTokens", () => {
  it("estimates chars/3.5 rounded up — backend context-budget.ts와 동일 계수", () => {
    expect(estimateTokens("")).toBe(0)
    expect(estimateTokens("abc")).toBe(1)
    expect(estimateTokens("a".repeat(35))).toBe(10)
    expect(estimateTokens("a".repeat(36))).toBe(11)
  })
})

describe("fitContextForInjection (안전 절단 폴백)", () => {
  it("keeps small responses untouched with truncated=false", () => {
    const fitted = fitContextForInjection({ index: "# Index", overview: "# Overview" })
    expect(fitted).toEqual({ index: "# Index", overview: "# Overview", truncated: false })
  })

  it("passes through the server truncated flag without re-truncating", () => {
    const fitted = fitContextForInjection({
      index: "# Index",
      overview: "...[truncated 120 tokens]",
      truncated: true,
    })
    expect(fitted.overview).toBe("...[truncated 120 tokens]")
    expect(fitted.truncated).toBe(true)
  })

  it("hard-truncates an oversized overview while preserving the index in full", () => {
    // 구버전 서버(budget 미지원)가 폴백 상한을 넘는 응답을 돌려준 상황.
    const index = "# Index\n- overview.md\n"
    const overview = "x".repeat(Math.ceil((FALLBACK_MAX_TOKENS + 500) * 3.5))
    const fitted = fitContextForInjection({ index, overview })
    expect(fitted.truncated).toBe(true)
    expect(fitted.index).toBe(index)
    expect(fitted.overview).toMatch(/\.\.\.\[truncated \d+ tokens\]$/)
    expect(estimateTokens(fitted.overview) + estimateTokens(fitted.index)).toBeLessThanOrEqual(
      FALLBACK_MAX_TOKENS + estimateTokens("\n...[truncated 99999 tokens]"),
    )
  })

  it("replaces the overview with a marker when the index alone exceeds the cap", () => {
    const index = "i".repeat(Math.ceil((FALLBACK_MAX_TOKENS + 100) * 3.5))
    const fitted = fitContextForInjection({ index, overview: "# Overview body" })
    expect(fitted.truncated).toBe(true)
    expect(fitted.index).toBe(index)
    expect(fitted.overview).toMatch(/^\.\.\.\[truncated \d+ tokens\]$/)
  })
})

describe("renderContextInjection", () => {
  it("renders the canonical injection header and body without a note when not truncated", () => {
    const text = renderContextInjection({
      branch: "main",
      context: { index: "# Index", overview: "# Overview" },
      head: "abc123",
    })
    expect(text).toBe("Specraft context for main@abc123:\n\n# Overview\n\n# Index\n")
    expect(text).not.toContain(TRUNCATION_NOTE)
  })

  it("appends the truncation note as the last line when the server truncated", () => {
    const text = renderContextInjection({
      branch: "main",
      context: { index: "# Index", overview: "...[truncated 9 tokens]", truncated: true },
      head: "abc123",
    })
    expect(text.endsWith(`\n${TRUNCATION_NOTE}\n`)).toBe(true)
  })

  it("appends the note when the proxy fallback truncates an oversized legacy response", () => {
    const text = renderContextInjection({
      branch: "main",
      context: {
        index: "# Index",
        overview: "x".repeat(Math.ceil((FALLBACK_MAX_TOKENS + 500) * 3.5)),
      },
      head: "abc123",
    })
    expect(text.endsWith(`\n${TRUNCATION_NOTE}\n`)).toBe(true)
  })

  it("keeps the injection budget below the fallback cap (이중 개입 방지 전제)", () => {
    expect(INJECTION_BUDGET_TOKENS).toBeLessThan(FALLBACK_MAX_TOKENS)
  })
})
