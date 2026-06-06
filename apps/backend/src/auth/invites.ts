import type { SpecraftDatabase } from "../storage/database.js"
import { createOpaqueToken } from "./tokens.js"

export function createInvite(
  database: SpecraftDatabase,
  createdBy: string,
): {
  readonly token: string
  readonly expires_at: string
} {
  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  database
    .prepare<[string, string, string]>(
      "INSERT INTO invites (token, created_by, expires_at) VALUES (?, ?, ?)",
    )
    .run(token, createdBy, expiresAt)
  return { token, expires_at: expiresAt }
}
