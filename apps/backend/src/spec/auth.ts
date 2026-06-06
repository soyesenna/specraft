import type { Member } from "@specraft/shared"
import type { FastifyReply, FastifyRequest } from "fastify"

import { readSessionMemberId } from "../auth/session.js"
import { getMember } from "../auth/store.js"
import { sendUnauthorized } from "../http/errors.js"
import type { SpecraftDatabase } from "../storage/database.js"

export function requireMember(
  request: FastifyRequest,
  reply: FastifyReply,
  database: SpecraftDatabase,
): Member | FastifyReply {
  const memberId = readSessionMemberId(request)
  const member = memberId ? getMember(database, memberId) : null
  return member ?? sendUnauthorized(reply)
}
