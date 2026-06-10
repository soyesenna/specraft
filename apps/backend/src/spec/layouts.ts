import { type GraphLayoutPosition, GraphLayoutPositionSchema } from "@specraft/shared"
import { z } from "zod"

import type { SpecraftDatabase } from "../storage/database.js"

const PositionsSchema = z.record(z.string(), GraphLayoutPositionSchema)

export type GraphLayoutPositions = Readonly<Record<string, GraphLayoutPosition>>

/** 멤버×브랜치별 노드 배치 오버라이드. 저장된 적 없으면 빈 맵. */
export function getGraphLayout(
  database: SpecraftDatabase,
  memberId: string,
  branch: string,
): GraphLayoutPositions {
  const row = database
    .prepare<[string, string], { positions: string }>(
      "SELECT positions FROM graph_layouts WHERE member_id = ? AND branch = ?",
    )
    .get(memberId, branch)
  if (!row) {
    return {}
  }
  try {
    const parsed = PositionsSchema.safeParse(JSON.parse(row.positions))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function saveGraphLayout(
  database: SpecraftDatabase,
  input: {
    readonly memberId: string
    readonly branch: string
    readonly positions: GraphLayoutPositions
  },
): void {
  database
    .prepare<[string, string, string, string]>(
      `INSERT INTO graph_layouts (member_id, branch, positions, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (member_id, branch)
       DO UPDATE SET positions = excluded.positions, updated_at = excluded.updated_at`,
    )
    .run(input.memberId, input.branch, JSON.stringify(input.positions), new Date().toISOString())
}
