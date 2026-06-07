import type {
  AdminInvite,
  AdminSettingsRequest,
  AdminSettingsViewResponse,
  ApiKey,
  Member,
  MemberRole,
} from "@specraft/shared"
import { z } from "zod"
import type { SpecraftDatabase } from "../storage/database.js"

import { encryptCredential } from "./credentials.js"
import { hashPassword, verifyPassword } from "./password.js"
import { apiKeyPrefix, createApiKeySecret, createId } from "./tokens.js"

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

const SessionMemberRowSchema = MemberRowSchema.extend({
  disabled_at: z.string().nullable(),
})

const ApiKeyAuthRowSchema = MemberRowSchema.extend({
  key_hash: z.string(),
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

const InviteListRowSchema = InviteRowSchema.extend({
  used_by_id: z.string().nullable(),
  used_by_email: z.string().email().nullable(),
  used_by_name: z.string().nullable(),
  used_by_role: z.enum(["admin", "member"]).nullable(),
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

class InviteUnavailableError extends Error {
  constructor() {
    super("invite is unavailable")
  }
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
  const member = buildMember(input)
  insertMember(database, member, await hashPassword(input.password), now())
  return member
}

export async function createMemberWithInvite(
  database: SpecraftDatabase,
  input: CreateMemberInput,
  inviteToken: string,
): Promise<Member | null> {
  if (!isInviteUsable(database, inviteToken)) {
    return null
  }
  const member = buildMember(input)
  const passwordHash = await hashPassword(input.password)
  const createdAt = now()
  try {
    return database.transaction(() => {
      insertMember(database, member, passwordHash, createdAt)
      const result = database
        .prepare<[string, string, string, string]>(
          "UPDATE invites SET used_at = ?, used_by = ? WHERE token = ? AND used_at IS NULL AND expires_at >= ?",
        )
        .run(createdAt, member.id, inviteToken, createdAt)
      if (result.changes !== 1) {
        throw new InviteUnavailableError()
      }
      return member
    })()
  } catch (error) {
    if (error instanceof InviteUnavailableError) {
      return null
    }
    throw error
  }
}

function buildMember(input: CreateMemberInput): Member {
  return {
    id: createId("mem"),
    email: input.email,
    name: input.name,
    role: input.role,
  } satisfies Member
}

function insertMember(
  database: SpecraftDatabase,
  member: Member,
  passwordHash: string,
  createdAt: string,
): void {
  database
    .prepare<[string, string, string, string, string, string]>(
      "INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(member.id, member.email, passwordHash, member.name, member.role, createdAt)
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
    .prepare<[string], unknown>(
      "SELECT id, email, name, role, disabled_at FROM members WHERE id = ?",
    )
    .get(id)
  const parsed = SessionMemberRowSchema.safeParse(row)
  if (!parsed.success || parsed.data.disabled_at !== null) {
    return null
  }
  return {
    id: parsed.data.id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
  }
}

export function listMembers(database: SpecraftDatabase): readonly Member[] {
  return z
    .array(MemberRowSchema)
    .parse(
      database
        .prepare<[], unknown>("SELECT id, email, name, role FROM members ORDER BY created_at")
        .all(),
    )
}

function isInviteUsable(database: SpecraftDatabase, token: string): boolean {
  const parsed = InviteRowSchema.safeParse(
    database
      .prepare<[string], unknown>("SELECT token, expires_at, used_at FROM invites WHERE token = ?")
      .get(token),
  )
  return parsed.success && parsed.data.used_at === null && parsed.data.expires_at >= now()
}

function toAdminInvite(row: z.infer<typeof InviteListRowSchema>): AdminInvite {
  const usedBy =
    row.used_by_id && row.used_by_email && row.used_by_name && row.used_by_role
      ? {
          id: row.used_by_id,
          email: row.used_by_email,
          name: row.used_by_name,
          role: row.used_by_role,
        }
      : null

  return {
    token: row.token,
    expires_at: row.expires_at,
    used_at: row.used_at,
    used_by: usedBy,
  }
}

export function listInvites(database: SpecraftDatabase): readonly AdminInvite[] {
  const rows = z.array(InviteListRowSchema).parse(
    database
      .prepare<[], unknown>(
        `SELECT invites.token, invites.expires_at, invites.used_at,
                members.id AS used_by_id, members.email AS used_by_email,
                members.name AS used_by_name, members.role AS used_by_role
         FROM invites
         LEFT JOIN members ON members.id = invites.used_by
         ORDER BY invites.expires_at DESC`,
      )
      .all(),
  )
  return rows.map(toAdminInvite)
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

export async function authenticateApiKey(
  database: SpecraftDatabase,
  apiKey: string,
): Promise<Member | null> {
  const rows = z.array(ApiKeyAuthRowSchema).parse(
    database
      .prepare<[], unknown>(
        `SELECT members.id, members.email, members.name, members.role, api_keys.key_hash
         FROM api_keys
         JOIN members ON members.id = api_keys.member_id
         WHERE api_keys.revoked_at IS NULL AND members.disabled_at IS NULL`,
      )
      .all(),
  )
  for (const row of rows) {
    if (await verifyPassword(row.key_hash, apiKey)) {
      return { id: row.id, email: row.email, name: row.name, role: row.role }
    }
  }
  return null
}

export function disableMember(database: SpecraftDatabase, id: string): void {
  database
    .prepare<[string, string]>(
      "UPDATE members SET disabled_at = ? WHERE id = ? AND role <> 'admin'",
    )
    .run(now(), id)
}

export function enableMember(database: SpecraftDatabase, id: string): void {
  database.prepare<[string]>("UPDATE members SET disabled_at = NULL WHERE id = ?").run(id)
}

export function updateSettings(
  database: SpecraftDatabase,
  settings: AdminSettingsRequest,
  credentialKey: string,
): void {
  const statement = database.prepare<[string, string]>(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      statement.run(key, key === "git_credential" ? encryptCredential(credentialKey, value) : value)
    }
  }
}

export function getSetting(database: SpecraftDatabase, key: string): string | null {
  const row = database
    .prepare<[string], { readonly value: string }>("SELECT value FROM settings WHERE key = ?")
    .get(key)
  return row?.value ?? null
}

export function getSettingsView(database: SpecraftDatabase): AdminSettingsViewResponse {
  return {
    git_remote_url: getSetting(database, "git_remote_url"),
    model_ingest: getSetting(database, "model_ingest"),
    model_query: getSetting(database, "model_query"),
    credential_configured: getSetting(database, "git_credential") !== null,
  }
}
