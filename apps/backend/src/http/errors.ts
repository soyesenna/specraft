import type { FastifyReply } from "fastify"

export function sendUnauthorized(reply: FastifyReply): FastifyReply {
  return reply.status(401).send({ error: "unauthorized" })
}

export function sendConflict(reply: FastifyReply, reason: string): FastifyReply {
  return reply.status(409).send({ error: reason })
}

export function sendValidationFailed(reply: FastifyReply): FastifyReply {
  return reply.status(422).send({ status: "rejected", reason: "validation_failed" })
}
