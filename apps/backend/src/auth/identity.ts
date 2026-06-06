import type { Member } from "@specraft/shared"
import type { FastifyReply, FastifyRequest } from "fastify"

import { sendUnauthorized } from "../http/errors.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { readSessionMemberId } from "./session.js"
import { authenticateApiKey, getMember } from "./store.js"

function bearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return null
  }
  return authorization.slice("Bearer ".length)
}

export async function currentMember(
  request: FastifyRequest,
  database: SpecraftDatabase,
): Promise<Member | null> {
  const memberId = readSessionMemberId(request)
  if (memberId) {
    return getMember(database, memberId)
  }
  const token = bearerToken(request)
  return token ? authenticateApiKey(database, token) : null
}

export async function requireMember(
  request: FastifyRequest,
  reply: FastifyReply,
  database: SpecraftDatabase,
): Promise<Member | FastifyReply> {
  const member = await currentMember(request, database)
  return member ?? sendUnauthorized(reply)
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  database: SpecraftDatabase,
): Promise<Member | FastifyReply> {
  const member = await currentMember(request, database)
  if (member?.role !== "admin") {
    return sendUnauthorized(reply)
  }
  return member
}
