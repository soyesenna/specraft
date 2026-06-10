import {
  GraphLayoutSaveRequestSchema,
  type WikiGraphResponse,
  WikiGraphResponseSchema,
} from "@specraft/shared"
import type { GraphNodePositions } from "./specsGraphModel.js"

/*
 * Specs 화면 로컬 캐시(stale-while-revalidate).
 * - 그래프: 마지막 응답을 저장해 재방문 시 스켈레톤 없이 즉시 렌더하고, 백그라운드
 *   fetch 결과로 교체한다.
 * - 레이아웃: 서버 저장 배치의 사본 — 서버 응답 도착 전 첫 프레임부터 적용한다.
 * 키에 memberId를 포함해 같은 브라우저에서 다른 계정으로 로그인해도 섞이지 않는다.
 * 저장 값은 shared zod 스키마로 검증하고, 손상·버전 불일치면 없는 것으로 취급한다.
 */

const CACHE_VERSION = 1

function graphKey(memberId: string, branch: string): string {
  return `specraft.specs.graph.${memberId}.${branch}`
}

function layoutKey(memberId: string, branch: string): string {
  return `specraft.specs.layout.${memberId}.${branch}`
}

/**
 * 캐시 저장소. 테스트(vitest)에서는 비활성 — 통합 테스트가 fetch mock으로
 * 로딩 상태를 결정적으로 검증할 수 있도록 한다. private 모드 등 접근 불가도 흡수.
 */
export function specsCacheStorage(): Storage | null {
  if (import.meta.env.MODE === "test") {
    return null
  }
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readVersionedPayload(storage: Storage | null, key: string): unknown {
  if (storage === null) {
    return undefined
  }
  try {
    const raw = storage.getItem(key)
    if (raw === null) {
      return undefined
    }
    const entry: unknown = JSON.parse(raw)
    if (typeof entry !== "object" || entry === null) {
      return undefined
    }
    const versioned = entry as { readonly v?: unknown; readonly payload?: unknown }
    return versioned.v === CACHE_VERSION ? versioned.payload : undefined
  } catch {
    return undefined
  }
}

function writeVersionedPayload(storage: Storage | null, key: string, payload: unknown): void {
  if (storage === null) {
    return
  }
  try {
    storage.setItem(key, JSON.stringify({ v: CACHE_VERSION, payload }))
  } catch {
    // 쿼터 초과 등 — 캐시는 보조 수단이므로 조용히 무시한다.
  }
}

export function readCachedGraph(
  storage: Storage | null,
  memberId: string | undefined,
  branch: string,
): WikiGraphResponse | null {
  if (!memberId) {
    return null
  }
  const payload = readVersionedPayload(storage, graphKey(memberId, branch))
  const parsed = WikiGraphResponseSchema.safeParse(payload)
  return parsed.success && parsed.data.branch === branch ? parsed.data : null
}

export function writeCachedGraph(
  storage: Storage | null,
  memberId: string | undefined,
  branch: string,
  graph: WikiGraphResponse,
): void {
  if (!memberId) {
    return
  }
  writeVersionedPayload(storage, graphKey(memberId, branch), graph)
}

export function readCachedLayout(
  storage: Storage | null,
  memberId: string | undefined,
  branch: string,
): GraphNodePositions | null {
  if (!memberId) {
    return null
  }
  const payload = readVersionedPayload(storage, layoutKey(memberId, branch))
  // {branch, positions} 형태 그대로 저장하므로 저장 요청 스키마를 재사용해 검증한다.
  const parsed = GraphLayoutSaveRequestSchema.safeParse(payload)
  return parsed.success && parsed.data.branch === branch ? parsed.data.positions : null
}

export function writeCachedLayout(
  storage: Storage | null,
  memberId: string | undefined,
  branch: string,
  positions: GraphNodePositions,
): void {
  if (!memberId) {
    return
  }
  writeVersionedPayload(storage, layoutKey(memberId, branch), { branch, positions })
}
