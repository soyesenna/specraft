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
 * M3.6 context 토큰 예산. overview+index 합산 추정이 예산을 초과하면
 * index를 우선 보존하고 overview만 줄인다. LLM provider가 있으면 요약을 시도하고,
 * 없거나 요약이 예산을 여전히 초과하면 명시적 절단 마커로 hard-truncate한다.
 */
export async function fitContextToBudget(input: {
  readonly overview: string
  readonly index: string
  readonly budgetTokens: number
  readonly provider?: LLMProvider | undefined
}): Promise<BudgetedContext> {
  const overviewTokens = estimateTokens(input.overview)
  const indexTokens = estimateTokens(input.index)
  if (overviewTokens + indexTokens <= input.budgetTokens) {
    return { overview: input.overview, truncated: false }
  }
  const remaining = input.budgetTokens - indexTokens
  if (remaining <= 0) {
    // index만으로 이미 예산 초과 — index는 보존하고 overview는 마커로 대체한다.
    return { overview: truncationMarker(overviewTokens), truncated: true }
  }
  if (input.provider) {
    const summary = await summarizeOverview(input.overview, remaining, input.provider)
    if (summary !== null && estimateTokens(summary) <= remaining) {
      return { overview: summary, truncated: true }
    }
  }
  return { overview: hardTruncate(input.overview, remaining), truncated: true }
}
