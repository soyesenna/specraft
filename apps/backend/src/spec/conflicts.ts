import type { Conflict, ConflictResolveResponse } from "@specraft/shared"
import { z } from "zod"

import type { SpecraftDatabase } from "../storage/database.js"

const ConflictRowSchema = z.object({
  id: z.string(),
  branch: z.string(),
  source_branch: z.string().nullable(),
  state: z.enum(["open", "resolving", "resolved"]),
  detail: z.string(),
})

function toConflict(row: z.infer<typeof ConflictRowSchema>): Conflict {
  const base = {
    id: row.id,
    branch: row.branch,
    state: row.state,
    detail: row.detail,
  }
  return row.source_branch === null ? base : { ...base, source_branch: row.source_branch }
}

export function listConflicts(database: SpecraftDatabase): readonly Conflict[] {
  const rows = z
    .array(ConflictRowSchema)
    .parse(
      database
        .prepare<[], unknown>(
          "SELECT id, branch, source_branch, state, detail FROM conflicts ORDER BY created_at",
        )
        .all(),
    )
  return rows.map(toConflict)
}

/** 충돌의 병합 대상(잠긴) 브랜치 — merge 직렬화 큐 키로 사용한다. */
export function conflictTargetBranch(database: SpecraftDatabase, id: string): string | null {
  const row = database
    .prepare<[string], { readonly branch: string | null }>(
      "SELECT branch FROM conflicts WHERE id = ?",
    )
    .get(id)
  return row?.branch ?? null
}

export function conflictHasSourceBranch(database: SpecraftDatabase, id: string): boolean {
  const row = database
    .prepare<[string], { readonly source_branch: string | null }>(
      "SELECT source_branch FROM conflicts WHERE id = ?",
    )
    .get(id)
  return row?.source_branch !== null && row?.source_branch !== undefined
}

export function resolveConflict(
  database: SpecraftDatabase,
  input: { readonly id: string; readonly directive: string; readonly memberId: string },
): ConflictResolveResponse {
  const row = ConflictRowSchema.safeParse(
    database
      .prepare<[string], unknown>(
        "SELECT id, branch, source_branch, state, detail FROM conflicts WHERE id = ?",
      )
      .get(input.id),
  )
  if (!row.success) {
    return { status: "still_locked" }
  }
  const now = new Date().toISOString()
  database
    .prepare<[string, string, string, string]>(
      "UPDATE conflicts SET state = 'resolved', resolved_at = ?, resolved_by = ?, directive = ? WHERE id = ?",
    )
    .run(now, input.memberId, input.directive, input.id)
  database.prepare<[string]>("DELETE FROM branch_locks WHERE branch = ?").run(row.data.branch)
  return {
    status: "resolved",
    conflict: { ...toConflict(row.data), state: "resolved" },
  }
}
