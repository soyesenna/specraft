import type {
  IngestLog,
  IngestLogListResponse,
  QueryLog,
  QueryLogListResponse,
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

const now = (): string => new Date().toISOString()

export function recordIngestLog(
  database: SpecraftDatabase,
  input: {
    readonly memberId: string
    readonly branch: string
    readonly commitHash: string
    readonly status: "accepted" | "rejected"
    readonly summary: string
    readonly wikiCommit?: string
  },
): string {
  const id = createId("ing")
  database
    .prepare<[string, string, string, string, string, string, string | null, string]>(
      "INSERT INTO ingest_logs (id, member_id, branch, commit_hash, status, summary, wiki_commit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      input.memberId,
      input.branch,
      input.commitHash,
      input.status,
      input.summary,
      input.wikiCommit ?? null,
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
