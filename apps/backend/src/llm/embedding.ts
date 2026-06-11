import http from "node:http"
import https from "node:https"

import { z } from "zod"

/**
 * M4+.4 embedding provider 추상화 — llm/provider.ts(LLMProvider)와 같은 패턴.
 * 임베딩 1회 호출 API만 노출하고, provider 부재 시 검색은 키워드 폴백으로 동작한다.
 */
export interface EmbeddingProvider {
  /** 입력 텍스트 배열을 같은 순서의 벡터 배열로 임베딩한다. */
  readonly embed: (texts: readonly string[]) => Promise<ReadonlyArray<readonly number[]>>
}

/** 결정적 테스트용 mock — 호출 기록을 남기고 사전 정의된 벡터(또는 해시 기반 벡터)를 반환한다. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly requests: string[][] = []
  readonly #vectorFor: (text: string) => readonly number[]

  constructor(vectorFor?: (text: string) => readonly number[]) {
    this.#vectorFor = vectorFor ?? hashVector
  }

  async embed(texts: readonly string[]): Promise<ReadonlyArray<readonly number[]>> {
    this.requests.push([...texts])
    return texts.map((text) => this.#vectorFor(text))
  }
}

/** 외부 API 없이 결정적인 벡터를 만든다 — 단어 토큰을 8차원 버킷으로 해싱한 빈도 벡터. */
function hashVector(text: string): readonly number[] {
  const vector = new Array<number>(8).fill(0)
  for (const token of text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []) {
    let hash = 0
    for (let index = 0; index < token.length; index += 1) {
      hash = (hash * 31 + token.charCodeAt(index)) >>> 0
    }
    const bucket = hash % vector.length
    vector[bucket] = (vector[bucket] ?? 0) + 1
  }
  return vector
}

const EmbeddingResponseSchema = z.object({
  data: z.array(
    z.object({
      index: z.number().int(),
      embedding: z.array(z.number()),
    }),
  ),
})

export type OpenAICompatibleEmbeddingOptions = {
  readonly apiKey: string
  readonly model: string
  /** OpenAI 호환 임베딩 엔드포인트의 베이스 URL — 기본값은 OpenRouter (기존 LLM provider와 동일 키 체계). */
  readonly baseUrl?: string
}

export class EmbeddingResponseError extends Error {
  constructor(statusCode: number, body: string) {
    super(`embedding request failed with ${statusCode}: ${body}`)
  }
}

/** OpenAI 호환 `/api/v1/embeddings` provider — openrouter.ts의 requestJson과 같은 http 패턴. */
export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly #options: OpenAICompatibleEmbeddingOptions

  constructor(options: OpenAICompatibleEmbeddingOptions) {
    this.#options = options
  }

  async embed(texts: readonly string[]): Promise<ReadonlyArray<readonly number[]>> {
    if (texts.length === 0) {
      return []
    }
    const url = new URL("/api/v1/embeddings", this.#options.baseUrl ?? "https://openrouter.ai")
    const response = await requestJson(
      url,
      {
        Authorization: `Bearer ${this.#options.apiKey}`,
        "Content-Type": "application/json",
      },
      { model: this.#options.model, input: texts },
    )
    const parsed = EmbeddingResponseSchema.parse(response)
    return [...parsed.data].sort((left, right) => left.index - right.index).map((d) => d.embedding)
  }
}

function requestJson(url: URL, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const payload = JSON.stringify(body)
  const transport = url.protocol === "http:" ? http : https
  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": String(Buffer.byteLength(payload)) },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on("data", (chunk: Buffer) => chunks.push(chunk))
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          if ((response.statusCode ?? 500) >= 400) {
            reject(new EmbeddingResponseError(response.statusCode ?? 500, text))
            return
          }
          resolve(JSON.parse(text))
        })
      },
    )
    request.on("error", reject)
    request.end(payload)
  })
}

/** 코사인 유사도 — 차원 불일치/영벡터는 0으로 처리해 랭킹에서 자연 탈락시킨다. */
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length === 0) {
    return 0
  }
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    const l = left[index] ?? 0
    const r = right[index] ?? 0
    dot += l * r
    leftNorm += l * l
    rightNorm += r * r
  }
  if (leftNorm === 0 || rightNorm === 0) {
    return 0
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}
