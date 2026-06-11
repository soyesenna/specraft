import type { SearchResponse, SearchResult } from "@specraft/shared"
import { z } from "zod"

import {
  listWikiFiles,
  listWikiLastModified,
  readWikiFile,
  type WikiRepository,
} from "../git/sync.js"
import { cosineSimilarity, type EmbeddingProvider } from "../llm/embedding.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { searchWikiByKeyword } from "./wiki-agent.js"

const defaultTopK = 8

export type WikiChunk = {
  readonly section: string
  readonly content: string
}

/**
 * M4+.4 청킹 — 섹션(heading) 단위로 나눈다. heading 이전의 본문은 "Overview" 섹션으로 묶고,
 * 빈 청크는 버린다. 섹션 단위는 citation(path#Section) 관례와 1:1로 대응해 결과 역참조가 쉽다.
 */
export function chunkWikiPage(content: string): readonly WikiChunk[] {
  const chunks: WikiChunk[] = []
  let section = "Overview"
  let lines: string[] = []
  const flush = (): void => {
    const text = lines.join("\n").trim()
    if (text !== "") {
      chunks.push({ section, content: text })
    }
    lines = []
  }
  for (const line of content.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      flush()
      section = line.replace(/^#+\s*/, "").trim() || "Overview"
    }
    lines.push(line)
  }
  flush()
  return chunks
}

const EmbeddingRowSchema = z.object({
  path: z.string(),
  section: z.string(),
  content: z.string(),
  embedding: z.string(),
})

/** 지정 페이지들의 임베딩 인덱스를 교체한다(삭제 후 재삽입 — 페이지 단위 upsert). */
export async function indexWikiPages(input: {
  readonly database: SpecraftDatabase
  readonly branch: string
  readonly provider: EmbeddingProvider
  readonly pages: ReadonlyArray<{ readonly path: string; readonly content: string }>
}): Promise<number> {
  const chunked = input.pages.flatMap((page) =>
    chunkWikiPage(page.content).map((chunk, chunkIndex) => ({
      ...chunk,
      path: page.path,
      chunkIndex,
    })),
  )
  const vectors = await input.provider.embed(chunked.map((chunk) => chunk.content))
  const remove = input.database.prepare<[string, string]>(
    "DELETE FROM wiki_embeddings WHERE branch = ? AND path = ?",
  )
  const insert = input.database.prepare<[string, string, number, string, string, string, string]>(
    `INSERT OR REPLACE INTO wiki_embeddings (branch, path, chunk_index, section, content, embedding, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const now = new Date().toISOString()
  for (const page of input.pages) {
    remove.run(input.branch, page.path)
  }
  chunked.forEach((chunk, index) => {
    insert.run(
      input.branch,
      chunk.path,
      chunk.chunkIndex,
      chunk.section,
      chunk.content,
      JSON.stringify(vectors[index] ?? []),
      now,
    )
  })
  return chunked.length
}

/** 브랜치 전체 재인덱스 — 관리 엔드포인트(POST /api/v1/admin/search/reindex)에서 사용한다. */
export async function reindexWikiBranch(input: {
  readonly database: SpecraftDatabase
  readonly wiki: WikiRepository
  readonly branch: string
  readonly provider: EmbeddingProvider
}): Promise<number> {
  input.database.prepare<[string]>("DELETE FROM wiki_embeddings WHERE branch = ?").run(input.branch)
  const pages = listWikiFiles(input.wiki)
    .filter((path) => path.endsWith(".md"))
    .map((path) => ({ path, content: readWikiFile(input.wiki, path) }))
  return indexWikiPages({
    database: input.database,
    branch: input.branch,
    provider: input.provider,
    pages,
  })
}

/**
 * ingest 커밋 이후 변경된 페이지만 재인덱싱한다(sinceCommit..branch 범위).
 * 삭제된 페이지는 인덱스 행만 제거한다. 인덱싱 실패가 ingest를 실패시키면 안 되므로
 * 호출부(routes)에서 try/catch로 감싼다.
 */
export async function indexChangedWikiPages(input: {
  readonly database: SpecraftDatabase
  readonly wiki: WikiRepository
  readonly branch: string
  readonly provider: EmbeddingProvider
  readonly sinceCommit: string
}): Promise<number> {
  const existing = new Set(listWikiFiles(input.wiki))
  const touched = [...listWikiLastModified(input.wiki, input.sinceCommit).keys()].filter((path) =>
    path.endsWith(".md"),
  )
  const removed = touched.filter((path) => !existing.has(path))
  const remove = input.database.prepare<[string, string]>(
    "DELETE FROM wiki_embeddings WHERE branch = ? AND path = ?",
  )
  for (const path of removed) {
    remove.run(input.branch, path)
  }
  const pages = touched
    .filter((path) => existing.has(path))
    .map((path) => ({ path, content: readWikiFile(input.wiki, path) }))
  if (pages.length === 0) {
    return 0
  }
  return indexWikiPages({
    database: input.database,
    branch: input.branch,
    provider: input.provider,
    pages,
  })
}

function hasEmbeddingIndex(database: SpecraftDatabase, branch: string): boolean {
  const row = database
    .prepare<[string], { found: number }>(
      "SELECT EXISTS (SELECT 1 FROM wiki_embeddings WHERE branch = ?) AS found",
    )
    .get(branch)
  return row?.found === 1
}

/**
 * 시맨틱(코사인) 검색 또는 키워드 폴백. provider가 없거나 해당 브랜치 인덱스가 비어 있으면
 * 키워드 폴백을 쓴다 — 인덱스 미구축 상태에서 빈 결과 대신 유용한 결과를 주고,
 * CI(무키) 환경에서 결정성을 보장하기 위함이다.
 */
export async function searchWiki(input: {
  readonly database: SpecraftDatabase
  readonly wiki: WikiRepository
  readonly branch: string
  readonly query: string
  readonly topK?: number
  readonly provider?: EmbeddingProvider | undefined
}): Promise<SearchResponse> {
  const topK = input.topK ?? defaultTopK
  if (!input.provider || !hasEmbeddingIndex(input.database, input.branch)) {
    const results: SearchResult[] = searchWikiByKeyword(input.wiki, input.query, topK).map(
      (hit) => ({ path: hit.path, section: hit.section, score: hit.score, snippet: hit.snippet }),
    )
    return { branch: input.branch, mode: "keyword", results }
  }
  const [queryVector] = await input.provider.embed([input.query])
  const rows = z
    .array(EmbeddingRowSchema)
    .parse(
      input.database
        .prepare<[string], unknown>(
          "SELECT path, section, content, embedding FROM wiki_embeddings WHERE branch = ?",
        )
        .all(input.branch),
    )
  const results: SearchResult[] = rows
    .map((row) => {
      let vector: readonly number[] = []
      try {
        const parsed: unknown = JSON.parse(row.embedding)
        vector = Array.isArray(parsed)
          ? parsed.filter((v): v is number => typeof v === "number")
          : []
      } catch {
        vector = []
      }
      return {
        path: row.path,
        section: row.section,
        score: cosineSimilarity(queryVector ?? [], vector),
        snippet: row.content.slice(0, 300),
      }
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.path.localeCompare(right.path) ||
        left.section.localeCompare(right.section),
    )
    .slice(0, topK)
  return { branch: input.branch, mode: "semantic", results }
}
