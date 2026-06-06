import type { AdminSettingsRequest, ApiKey, Member, MemberRole } from "@specraft/shared"
import { z } from "zod"
import type { SpecraftDatabase } from "../storage/database.js"

import { hashPassword, verifyPassword } from "./password.js"
import { apiKeyPrefix, createApiKeySecret, createId, createOpaqueToken } from "./tokens.js"

const now = (): string => new Date().toISOString()

const MemberRowSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "member"]),
})

const LoginRowSchema = MemberRowSchema.extend({
  password_hash: z.string(),
  disabled_at: z.string().nullable(),
})

const ApiKeyRowSchema = z.object({
  id: z.string(),
  prefix: z.string(),
  name: z.string(),
  created_at: z.string(),
  revoked_at: z.string().nullable(),
})

const InviteRowSchema = z.object({
  token: z.string(),
  expires_at: z.string(),
  used_at: z.string().nullable(),
})

export type CreateMemberInput = {
  readonly email: string
  readonly password: string
  readonly name: string
  readonly role: MemberRole
}

export type CreatedApiKey = {
  readonly id: string
  readonly api_key: string
}

export function hasMembers(database: SpecraftDatabase): boolean {
  const row = database
    .prepare<[], { readonly count: number }>("SELECT COUNT(*) AS count FROM members")
    .get()
  return (row?.count ?? 0) > 0
}

export async function createMember(
  database: SpecraftDatabase,
  input: CreateMemberInput,
): Promise<Member> {
  const member = {
    id: createId("mem"),
    email: input.email,
    name: input.name,
    role: input.role,
  } satisfies Member
  const passwordHash = await hashPassword(input.password)
  database
    .prepare<[string, string, string, string, string, string]>(
      "INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(member.id, member.email, passwordHash, member.name, member.role, now())
  return member
}

export async function authenticateMember(
  database: SpecraftDatabase,
  email: string,
  password: string,
): Promise<Member | null> {
  const row = LoginRowSchema.safeParse(
    database.prepare<[string], unknown>("SELECT * FROM members WHERE email = ?").get(email),
  )
  if (!row.success || row.data.disabled_at !== null) {
    return null
  }
  if (!(await verifyPassword(row.data.password_hash, password))) {
    return null
  }
  return {
    id: row.data.id,
    email: row.data.email,
    name: row.data.name,
    role: row.data.role,
  }
}

export function getMember(database: SpecraftDatabase, id: string): Member | null {
  const row = database
    .prepare<[string], unknown>("SELECT id, email, name, role FROM members WHERE id = ?")
    .get(id)
  const parsed = MemberRowSchema.safeParse(row)
  return parsed.success ? parsed.data : null
}

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

export function consumeInvite(
  database: SpecraftDatabase,
  token: string,
  memberId: string,
): boolean {
  const parsed = InviteRowSchema.safeParse(
    database
      .prepare<[string], unknown>("SELECT token, expires_at, used_at FROM invites WHERE token = ?")
      .get(token),
  )
  if (!parsed.success || parsed.data.used_at !== null || parsed.data.expires_at < now()) {
    return false
  }
  database
    .prepare<[string, string, string]>(
      "UPDATE invites SET used_at = ?, used_by = ? WHERE token = ?",
    )
    .run(now(), memberId, token)
  return true
}

export async function createApiKey(
  database: SpecraftDatabase,
  memberId: string,
  name: string,
): Promise<CreatedApiKey> {
  const apiKey = createApiKeySecret()
  const id = createId("key")
  database
    .prepare<[string, string, string, string, string, string]>(
      "INSERT INTO api_keys (id, member_id, key_hash, prefix, name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, memberId, await hashPassword(apiKey), apiKeyPrefix(), name, now())
  return { id, api_key: apiKey }
}

export function listApiKeys(database: SpecraftDatabase, memberId: string): readonly ApiKey[] {
  return z
    .array(ApiKeyRowSchema)
    .parse(
      database
        .prepare<[string], unknown>(
          "SELECT id, prefix, name, created_at, revoked_at FROM api_keys WHERE member_id = ? ORDER BY created_at",
        )
        .all(memberId),
    )
}

export function revokeApiKey(database: SpecraftDatabase, memberId: string, id: string): void {
  database
    .prepare<[string, string, string]>(
      "UPDATE api_keys SET revoked_at = ? WHERE id = ? AND member_id = ? AND revoked_at IS NULL",
    )
    .run(now(), id, memberId)
}

export function updateSettings(database: SpecraftDatabase, settings: AdminSettingsRequest): void {
  const statement = database.prepare<[string, string]>(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      statement.run(key, value)
    }
  }
}
