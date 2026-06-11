import type { LLMProvider } from "../llm/provider.js"

// 토큰 추정 휴리스틱: chars/3.5 — scripts/measure-tool-tokens.mjs 와 동일 계수.
// 마크다운/JSON은 구두점이 많아 영어 경험칙(~4 chars/token)보다 잘게 토크나이즈되므로
// 3.5로 나눠 보수적으로(과대) 추정한다.
const HEURISTIC_CHARS_PER_TOKEN = 3.5

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / HEURISTIC_CHARS_PER_TOKEN)
}

export type BudgetedContext = {
  readonly overview: string
  readonly truncated: boolean
}

function truncationMarker(cutTokens: number): string {
  return `...[truncated ${cutTokens} tokens]`
}

function hardTruncate(overview: string, remainingTokens: number): string {
  // 마커 자신도 예산에 포함되도록 마커 추정 토큰을 선차감한다.
  const markerReserve = estimateTokens(truncationMarker(estimateTokens(overview)))
  const keepChars = Math.max(
    0,
    Math.floor((remainingTokens - markerReserve) * HEURISTIC_CHARS_PER_TOKEN),
  )
  const kept = overview.slice(0, keepChars)
  const cutTokens = estimateTokens(overview) - estimateTokens(kept)
  return kept.length > 0 ? `${kept}\n${truncationMarker(cutTokens)}` : truncationMarker(cutTokens)
}

async function summarizeOverview(
  overview: string,
  budgetTokens: number,
  provider: LLMProvider,
): Promise<string | null> {
  try {
    const response = await provider.complete({
      messages: [
        {
          role: "system",
          content: `Summarize the wiki overview below so it fits within about ${budgetTokens} tokens. Preserve headings and key facts. Reply with the summary only.`,
        },
        { role: "user", content: overview },
      ],
      tools: [],
    })
    return response.content.length > 0 ? response.content : null
  } catch {
    return null
  }
}

/**
 * M3.6 context 토큰 예산 + M4+.5 steering 주입. 보존 순서는 steering ≥ index > overview —
 * steering 블록은 어떤 예산에서도 절단하지 않고 overview 앞에 그대로 붙이며, index를 그다음으로
 * 보존하고 overview만 줄인다. LLM provider가 있으면 overview 요약을 시도하고,
 * 없거나 요약이 예산을 여전히 초과하면 명시적 절단 마커로 hard-truncate한다.
 * 반환 overview에는 steering 블록이 이미 합쳐져 있다(응답 스키마 무변경).
 */
export async function fitContextToBudget(input: {
  readonly overview: string
  readonly index: string
  /** 이미 "## Steering\n..." 형태로 렌더된 블록 — 존재 시 항상 전체 보존된다. */
  readonly steering?: string | undefined
  readonly budgetTokens: number
  readonly provider?: LLMProvider | undefined
}): Promise<BudgetedContext> {
  const withSteering = (overview: string): string =>
    input.steering === undefined ? overview : `${input.steering}\n\n${overview}`
  const overviewTokens = estimateTokens(input.overview)
  const indexTokens = estimateTokens(input.index)
  const steeringTokens = input.steering === undefined ? 0 : estimateTokens(input.steering)
  if (steeringTokens + overviewTokens + indexTokens <= input.budgetTokens) {
    return { overview: withSteering(input.overview), truncated: false }
  }
  const remaining = input.budgetTokens - indexTokens - steeringTokens
  if (remaining <= 0) {
    // steering+index만으로 이미 예산 초과 — 둘은 보존하고 overview는 마커로 대체한다.
    return { overview: withSteering(truncationMarker(overviewTokens)), truncated: true }
  }
  if (input.provider) {
    const summary = await summarizeOverview(input.overview, remaining, input.provider)
    if (summary !== null && estimateTokens(summary) <= remaining) {
      return { overview: withSteering(summary), truncated: true }
    }
  }
  return { overview: withSteering(hardTruncate(input.overview, remaining)), truncated: true }
}
