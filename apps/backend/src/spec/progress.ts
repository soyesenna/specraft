import type { FeatureProgress, ProgressUpdate } from "@specraft/shared"
import { FeatureProgressSchema } from "@specraft/shared"
import { z } from "zod"

import type { SpecraftDatabase } from "../storage/database.js"

/**
 * M4+.3 진행률 보드 — ingest 수락 시 progress_updates를 feature별 최신 상태로 집계한다.
 * 같은 (branch, feature) 키는 가장 최근 ingest가 덮어쓴다 (INSERT OR REPLACE).
 */
export function upsertFeatureProgress(
  database: SpecraftDatabase,
  input: {
    readonly branch: string
    readonly ingestId: string
    readonly updates: readonly ProgressUpdate[]
    readonly updatedAt?: string
  },
): void {
  if (input.updates.length === 0) {
    return
  }
  const updatedAt = input.updatedAt ?? new Date().toISOString()
  const upsert = database.prepare<[string, string, string, string, string, string]>(
    `INSERT OR REPLACE INTO feature_progress (branch, feature, status, note, updated_at, source_ingest_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  for (const update of input.updates) {
    upsert.run(input.branch, update.feature, update.status, update.note, updatedAt, input.ingestId)
  }
}

export function listFeatureProgress(
  database: SpecraftDatabase,
  branch?: string,
): readonly FeatureProgress[] {
  const rows =
    branch === undefined
      ? database
          .prepare<[], unknown>(
            `SELECT branch, feature, status, note, updated_at, source_ingest_id
             FROM feature_progress ORDER BY branch, feature`,
          )
          .all()
      : database
          .prepare<[string], unknown>(
            `SELECT branch, feature, status, note, updated_at, source_ingest_id
             FROM feature_progress WHERE branch = ? ORDER BY feature`,
          )
          .all(branch)
  return z.array(FeatureProgressSchema).parse(rows)
}
