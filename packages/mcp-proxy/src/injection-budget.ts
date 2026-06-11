import type { ContextResponse } from "@specraft/shared"

/**
 * M3.6 주입 예산 — session-start/post-compact 컨텍스트 주입은 호스트 컨텍스트 창을
 * 잠식하지 않도록 서버에 budget_tokens로 요청한다. 2000은 계획(M3.6)의
 * "주입 본문은 ~2k 토큰 이내" 목표치를 그대로 상수화한 값이다.
 */
export const INJECTION_BUDGET_TOKENS = 2000

/**
 * 안전 절단 폴백 상한 — 서버가 budget_tokens 미지원(구버전)이라 과대 응답을
 * 돌려줘도 주입이 이 추정치를 넘지 않도록 proxy에서 직접 절단한다.
 * 예산(2000)보다 여유를 두는 이유: 서버 절단이 정상 동작하는 한 폴백이
 * 이중으로 개입하지 않게 하기 위함이다.
 */
export const FALLBACK_MAX_TOKENS = 3000

/** truncated 응답(또는 폴백 절단) 시 주입 문구 끝에 붙는 1줄 표식. */
export const TRUNCATION_NOTE = "[context truncated to fit budget]"

// 토큰 추정 휴리스틱: chars/3.5 — backend context-budget.ts 와 동일 계수(보수적 과대 추정).
const HEURISTIC_CHARS_PER_TOKEN = 3.5

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / HEURISTIC_CHARS_PER_TOKEN)
}

export type FittedInjection = {
  readonly overview: string
  readonly index: string
  readonly truncated: boolean
}

type InjectableContext = Pick<ContextResponse, "overview" | "index" | "truncated">

function truncationMarker(cutTokens: number): string {
  return `...[truncated ${cutTokens} tokens]`
}

/**
 * 주입용 컨텍스트를 폴백 상한에 맞춘다. 서버 응답이 상한 이내면 그대로 두고
 * (서버 truncated 플래그만 전달), 상한 초과면 backend fitContextToBudget 와 같은
 * 우선순위로 index를 온전히 보존하고 overview만 hard-truncate 한다.
 */
export function fitContextForInjection(context: InjectableContext): FittedInjection {
  const serverTruncated = context.truncated === true
  const overviewTokens = estimateTokens(context.overview)
  if (overviewTokens + estimateTokens(context.index) <= FALLBACK_MAX_TOKENS) {
    return { index: context.index, overview: context.overview, truncated: serverTruncated }
  }
  const remaining = FALLBACK_MAX_TOKENS - estimateTokens(context.index)
  if (remaining <= 0) {
    // index만으로 이미 상한 초과 — index는 보존하고 overview는 마커로 대체한다.
    return { index: context.index, overview: truncationMarker(overviewTokens), truncated: true }
  }
  const keepChars = Math.max(0, Math.floor(remaining * HEURISTIC_CHARS_PER_TOKEN))
  const kept = context.overview.slice(0, keepChars)
  const cutTokens = overviewTokens - estimateTokens(kept)
  const overview =
    kept.length > 0 ? `${kept}\n${truncationMarker(cutTokens)}` : truncationMarker(cutTokens)
  return { index: context.index, overview, truncated: true }
}

/**
 * session-start/context 훅이 stdout으로 내보내는 주입 본문을 만든다.
 * 절단이 일어났으면(서버 truncated=true 또는 폴백 절단) 끝에 TRUNCATION_NOTE 1줄을 붙인다.
 */
export function renderContextInjection(input: {
  readonly branch: string
  readonly head: string
  readonly context: InjectableContext
}): string {
  const fitted = fitContextForInjection(input.context)
  const note = fitted.truncated ? `\n${TRUNCATION_NOTE}` : ""
  return `Specraft context for ${input.branch}@${input.head}:\n\n${fitted.overview}\n\n${fitted.index}${note}\n`
}
