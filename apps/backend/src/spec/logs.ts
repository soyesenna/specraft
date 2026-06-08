import type {
  Citation,
  IngestLog,
  IngestLogDetail,
  IngestLogListResponse,
  ProgressUpdate,
  QueryLog,
  QueryLogDetail,
  QueryLogListResponse,
  SpecChange,
  ToolCall,
} from "@specraft/shared"
import {
  CitationSchema,
  ProgressUpdateSchema,
  SpecChangeSchema,
  ToolCallSchema,
} from "@specraft/shared"
import { z } from "zod"

import { createId } from "../auth/tokens.js"
import type { SpecraftDatabase } from "../storage/database.js"

const IngestLogRowSchema = z.object({
  id: z.string(),
  member_id: z.string(),
  member_email: z.string().email(),
  member_name: z.string(),
  branch: z.string(),
  commit_hash: z.string(),
  status: z.enum(["accepted", "rejected"]),
  summary: z.string(),
  wiki_commit: z.string().nullable(),
  created_at: z.string(),
})

const QueryLogRowSchema = z.object({
  id: z.string(),
  member_id: z.string(),
  member_email: z.string().email(),
  member_name: z.string(),
  branch: z.string(),
  question: z.string(),
  created_at: z.string(),
})

// 상세 조회 전용 Row 스키마 — 신규 nullable JSON 컬럼을 추가로 SELECT한다.
const IngestLogDetailRowSchema = IngestLogRowSchema.extend({
  spec_changes: z.string().nullable(),
  progress_updates: z.string().nullable(),
  open_questions: z.string().nullable(),
})

const QueryLogDetailRowSchema = QueryLogRowSchema.extend({
  answer: z.string().nullable(),
  citations: z.string().nullable(),
  tool_calls: z.string().nullable(),
})

const now = (): string => new Date().toISOString()

// nullable JSON 컬럼을 안전하게 배열로 파싱한다. null·미저장·파싱 실패는 빈 배열로 처리한다.
function parseJsonArray<T>(serialized: string | null, schema: z.ZodType<T>): T[] {
  if (serialized === null) {
    return []
  }
  try {
    return z.array(schema).parse(JSON.parse(serialized))
  } catch {
    return []
  }
}

export function recordIngestLog(
  database: SpecraftDatabase,
  input: {
    readonly memberId: string
    readonly branch: string
    readonly commitHash: string
    readonly status: "accepted" | "rejected"
    readonly summary: string
    readonly wikiCommit?: string
    readonly specChanges?: readonly SpecChange[]
    readonly progressUpdates?: readonly ProgressUpdate[]
    readonly openQuestions?: readonly string[]
  },
): string {
  const id = createId("ing")
  database
    .prepare<
      [
        string,
        string,
        string,
        string,
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string,
      ]
    >(
      "INSERT INTO ingest_logs (id, member_id, branch, commit_hash, status, summary, wiki_commit, spec_changes, progress_updates, open_questions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      input.memberId,
      input.branch,
      input.commitHash,
      input.status,
      input.summary,
      input.wikiCommit ?? null,
      input.specChanges ? JSON.stringify(input.specChanges) : null,
      input.progressUpdates ? JSON.stringify(input.progressUpdates) : null,
      input.openQuestions ? JSON.stringify(input.openQuestions) : null,
      now(),
    )
  return id
}

export function recordQueryLog(
  database: SpecraftDatabase,
  input: { readonly memberId: string; readonly branch: string; readonly question: string },
): string {
  const id = createId("qry")
  database
    .prepare<[string, string, string, string, string]>(
      "INSERT INTO query_logs (id, member_id, branch, question, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, input.memberId, input.branch, input.question, now())
  return id
}

// 쿼리 응답이 완성된 뒤 답변·인용·도구 타임라인을 저장한다(스트림/논스트림 공통).
export function updateQueryLogResult(
  database: SpecraftDatabase,
  input: {
    readonly queryId: string
    readonly answer: string
    readonly citations: readonly Citation[]
    readonly toolCalls: readonly ToolCall[]
  },
): void {
  database
    .prepare<[string, string, string, string]>(
      "UPDATE query_logs SET answer = ?, citations = ?, tool_calls = ? WHERE id = ?",
    )
    .run(
      input.answer,
      JSON.stringify(input.citations),
      JSON.stringify(input.toolCalls),
      input.queryId,
    )
}

function toIngestLog(row: z.infer<typeof IngestLogRowSchema>): IngestLog {
  const base = {
    id: row.id,
    member: { id: row.member_id, email: row.member_email, name: row.member_name },
    branch: row.branch,
    commit_hash: row.commit_hash,
    status: row.status,
    summary: row.summary,
    created_at: row.created_at,
  }
  return row.wiki_commit === null ? base : { ...base, wiki_commit: row.wiki_commit }
}

function toQueryLog(row: z.infer<typeof QueryLogRowSchema>): QueryLog {
  return {
    id: row.id,
    member: { id: row.member_id, email: row.member_email, name: row.member_name },
    branch: row.branch,
    question: row.question,
    created_at: row.created_at,
  }
}

export function listIngestLogs(database: SpecraftDatabase): IngestLogListResponse {
  const rows = z.array(IngestLogRowSchema).parse(
    database
      .prepare<[], unknown>(
        `SELECT ingest_logs.id, members.id AS member_id, members.email AS member_email,
                members.name AS member_name, ingest_logs.branch, ingest_logs.commit_hash,
                ingest_logs.status, ingest_logs.summary, ingest_logs.wiki_commit, ingest_logs.created_at
         FROM ingest_logs
         JOIN members ON members.id = ingest_logs.member_id
         ORDER BY ingest_logs.created_at`,
      )
      .all(),
  )
  return { logs: rows.map(toIngestLog), next_cursor: null }
}

export function listQueryLogs(database: SpecraftDatabase): QueryLogListResponse {
  const rows = z.array(QueryLogRowSchema).parse(
    database
      .prepare<[], unknown>(
        `SELECT query_logs.id, members.id AS member_id, members.email AS member_email,
                members.name AS member_name, query_logs.branch, query_logs.question,
                query_logs.created_at
         FROM query_logs
         JOIN members ON members.id = query_logs.member_id
         ORDER BY query_logs.created_at`,
      )
      .all(),
  )
  return { logs: rows.map(toQueryLog), next_cursor: null }
}

export function getIngestLogDetail(database: SpecraftDatabase, id: string): IngestLogDetail | null {
  const row = database
    .prepare<[string], unknown>(
      `SELECT ingest_logs.id, members.id AS member_id, members.email AS member_email,
              members.name AS member_name, ingest_logs.branch, ingest_logs.commit_hash,
              ingest_logs.status, ingest_logs.summary, ingest_logs.wiki_commit,
              ingest_logs.spec_changes, ingest_logs.progress_updates, ingest_logs.open_questions,
              ingest_logs.created_at
       FROM ingest_logs
       JOIN members ON members.id = ingest_logs.member_id
       WHERE ingest_logs.id = ?`,
    )
    .get(id)
  if (row === undefined) {
    return null
  }
  const parsed = IngestLogDetailRowSchema.parse(row)
  return {
    ...toIngestLog(parsed),
    spec_changes: parseJsonArray(parsed.spec_changes, SpecChangeSchema),
    progress_updates: parseJsonArray(parsed.progress_updates, ProgressUpdateSchema),
    open_questions: parseJsonArray(parsed.open_questions, z.string()),
  }
}

export function getQueryLogDetail(database: SpecraftDatabase, id: string): QueryLogDetail | null {
  const row = database
    .prepare<[string], unknown>(
      `SELECT query_logs.id, members.id AS member_id, members.email AS member_email,
              members.name AS member_name, query_logs.branch, query_logs.question,
              query_logs.answer, query_logs.citations, query_logs.tool_calls,
              query_logs.created_at
       FROM query_logs
       JOIN members ON members.id = query_logs.member_id
       WHERE query_logs.id = ?`,
    )
    .get(id)
  if (row === undefined) {
    return null
  }
  const parsed = QueryLogDetailRowSchema.parse(row)
  return {
    ...toQueryLog(parsed),
    answer: parsed.answer,
    citations: parseJsonArray(parsed.citations, CitationSchema),
    tool_calls: parseJsonArray(parsed.tool_calls, ToolCallSchema),
  }
}
