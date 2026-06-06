import {
  AdminSettingsRequestSchema,
  ApiKeyCreateRequestSchema,
  ApiKeyDeleteRequestSchema,
  AuthLoginRequestSchema,
  AuthSignupRequestSchema,
} from "@specraft/shared"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"

import { sendConflict, sendUnauthorized, sendValidationFailed } from "../http/errors.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { readSessionMemberId, setSessionCookie } from "./session.js"
import {
  authenticateMember,
  consumeInvite,
  createApiKey,
  createInvite,
  createMember,
  getMember,
  hasMembers,
  listApiKeys,
  revokeApiKey,
  updateSettings,
} from "./store.js"

const BootstrapAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1),
})

type AuthContext = {
  readonly database: SpecraftDatabase
}

function currentMember(request: FastifyRequest, database: SpecraftDatabase) {
  const memberId = readSessionMemberId(request)
  return memberId ? getMember(database, memberId) : null
}

function requireMember(request: FastifyRequest, reply: FastifyReply, database: SpecraftDatabase) {
  const member = currentMember(request, database)
  return member ?? sendUnauthorized(reply)
}

function requireAdmin(request: FastifyRequest, reply: FastifyReply, database: SpecraftDatabase) {
  const member = currentMember(request, database)
  if (member?.role !== "admin") {
    return sendUnauthorized(reply)
  }
  return member
}

export function registerAuthRoutes(server: FastifyInstance, context: AuthContext): void {
  server.post("/api/v1/auth/bootstrap-admin", async (request, reply) => {
    const parsed = BootstrapAdminSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    if (hasMembers(context.database)) {
      return sendConflict(reply, "admin_already_exists")
    }
    const member = await createMember(context.database, { ...parsed.data, role: "admin" })
    setSessionCookie(reply, member.id)
    return { member }
  })

  server.post("/api/v1/admin/invites", async (request, reply) => {
    const member = requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const invite = createInvite(context.database, member.id)
    return {
      invite_url: `https://specraft.local/invite/${invite.token}`,
      expires_at: invite.expires_at,
    }
  })

  server.post("/api/v1/auth/signup", async (request, reply) => {
    const parsed = AuthSignupRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const member = await createMember(context.database, { ...parsed.data, role: "member" })
    if (!consumeInvite(context.database, parsed.data.invite_token, member.id)) {
      return sendValidationFailed(reply)
    }
    setSessionCookie(reply, member.id)
    return { member }
  })

  server.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = AuthLoginRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const member = await authenticateMember(
      context.database,
      parsed.data.email,
      parsed.data.password,
    )
    if (!member) {
      return sendUnauthorized(reply)
    }
    setSessionCookie(reply, member.id)
    return { member }
  })

  server.post("/api/v1/keys", async (request, reply) => {
    const member = requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = ApiKeyCreateRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    return createApiKey(context.database, member.id, parsed.data.name)
  })

  server.get("/api/v1/keys", async (request, reply) => {
    const member = requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { keys: listApiKeys(context.database, member.id) }
  })

  server.delete("/api/v1/keys", async (request, reply) => {
    const member = requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = ApiKeyDeleteRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    revokeApiKey(context.database, member.id, parsed.data.id)
    return { status: "ok" }
  })

  server.put("/api/v1/admin/settings", async (request, reply) => {
    const member = requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = AdminSettingsRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    updateSettings(context.database, parsed.data)
    return { status: "ok" }
  })
}
