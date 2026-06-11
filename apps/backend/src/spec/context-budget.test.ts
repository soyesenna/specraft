import { describe, expect, it } from "vitest"

import { MockProvider } from "../llm/provider.js"
import { estimateTokens, fitContextToBudget } from "./context-budget.js"

describe("context token budget (M3.6)", () => {
  const overview = `# Overview\n${"specraft keeps one source of truth. ".repeat(40)}`
  const index = "# Index\n- [overview.md](overview.md)\n"

  it("keeps everything untouched when within budget", async () => {
    const result = await fitContextToBudget({ overview, index, budgetTokens: 100000 })
    expect(result.overview).toBe(overview)
    expect(result.truncated).toBe(false)
  })

  it("preserves index first and hard-truncates overview with an explicit marker", async () => {
    const budget = estimateTokens(index) + 20
    const result = await fitContextToBudget({ overview, index, budgetTokens: budget })
    expect(result.truncated).toBe(true)
    expect(result.overview).toMatch(/\.\.\.\[truncated \d+ tokens\]$/)
    // index를 통째로 보존한 상태에서 overview가 잔여 예산 안에 들어온다.
    expect(estimateTokens(result.overview) + estimateTokens(index)).toBeLessThanOrEqual(budget)
  })

  it("replaces overview with a marker only when the index alone exceeds the budget", async () => {
    const result = await fitContextToBudget({ overview, index, budgetTokens: 1 })
    expect(result.truncated).toBe(true)
    expect(result.overview).toMatch(/^\.\.\.\[truncated \d+ tokens\]$/)
  })

  it("summarizes via the LLM provider when available and the summary fits", async () => {
    const provider = new MockProvider([{ role: "assistant", content: "Short summary." }])
    const budget = estimateTokens(index) + 20
    const result = await fitContextToBudget({ overview, index, budgetTokens: budget, provider })
    expect(result.truncated).toBe(true)
    expect(result.overview).toBe("Short summary.")
    expect(provider.requests).toHaveLength(1)
  })

  it("falls back to hard truncation when the summary still exceeds the budget", async () => {
    const provider = new MockProvider([{ role: "assistant", content: "x".repeat(5000) }])
    const budget = estimateTokens(index) + 20
    const result = await fitContextToBudget({ overview, index, budgetTokens: budget, provider })
    expect(result.truncated).toBe(true)
    expect(result.overview).toContain("[truncated")
  })
})
