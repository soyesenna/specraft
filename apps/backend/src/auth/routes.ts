import {
  AdminMemberEnableRequestSchema,
  AdminSettingsRequestSchema,
  ApiKeyCreateRequestSchema,
  ApiKeyDeleteRequestSchema,
  AuthLoginRequestSchema,
  AuthSignupRequestSchema,
  BootstrapAdminRequestSchema,
} from "@specraft/shared"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import {
  testGitConnection as defaultTestGitConnection,
  type GitConnectionTester,
} from "../git/connection.js"
import { sendConflict, sendUnauthorized, sendValidationFailed } from "../http/errors.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { decryptCredential } from "./credentials.js"
import { requireAdmin, requireMember } from "./identity.js"
import { createInvite } from "./invites.js"
import { clearSessionCookie, setSessionCookie } from "./session.js"
import {
  authenticateMember,
  createApiKey,
  createMember,
  createMemberWithInvite,
  disableMember,
  enableMember,
  getSetting,
  getSettingsView,
  hasMembers,
  listApiKeys,
  listInvites,
  listMembers,
  revokeApiKey,
  updateSettings,
} from "./store.js"

type AuthContext = {
  readonly database: SpecraftDatabase
  readonly credentialKey: string
  readonly gitConnectionTester?: GitConnectionTester
}

export function registerAuthRoutes(server: FastifyInstance, context: AuthContext): void {
  server.post("/api/v1/auth/bootstrap-admin", async (request, reply) => {
    const parsed = BootstrapAdminRequestSchema.safeParse(request.body)
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

  server.get("/api/v1/auth/session", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { member }
  })

  server.post("/api/v1/admin/invites", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const invite = createInvite(context.database, member.id)
    return {
      invite_url: `https://specraft.local/invite/${invite.token}`,
      expires_at: invite.expires_at,
    }
  })

  server.get("/api/v1/admin/invites", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { invites: listInvites(context.database) }
  })

  server.post("/api/v1/auth/signup", async (request, reply) => {
    const parsed = AuthSignupRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const member = await createMemberWithInvite(
      context.database,
      { ...parsed.data, role: "member" },
      parsed.data.invite_token,
    )
    if (!member) {
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

  server.post("/api/v1/auth/logout", async (_request, reply) => {
    clearSessionCookie(reply)
    return { status: "ok" }
  })

  server.post("/api/v1/keys", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
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
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { keys: listApiKeys(context.database, member.id) }
  })

  server.delete("/api/v1/keys", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
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
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = AdminSettingsRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    updateSettings(context.database, parsed.data, context.credentialKey)
    return { status: "ok" }
  })

  server.get("/api/v1/admin/settings", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return getSettingsView(context.database)
  })

  server.get("/api/v1/admin/members", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { members: listMembers(context.database) }
  })

  server.put("/api/v1/admin/members/:id/disable", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    disableMember(context.database, parsed.data.id)
    return { status: "ok" }
  })

  server.post("/api/v1/admin/members/enable", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = AdminMemberEnableRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    enableMember(context.database, parsed.data.id)
    return { status: "ok" }
  })

  server.post("/api/v1/admin/git/test-connection", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const remoteUrl = getSetting(context.database, "git_remote_url")
    if (!remoteUrl) {
      return { status: "failed", message: "git remote url is not configured" }
    }
    const storedCredential = getSetting(context.database, "git_credential")
    const credential = storedCredential
      ? decryptCredential(context.credentialKey, storedCredential)
      : undefined
    const tester = context.gitConnectionTester ?? defaultTestGitConnection
    return tester(credential ? { remoteUrl, credential } : { remoteUrl })
  })
}
