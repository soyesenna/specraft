import type {} from "@fastify/cookie"
import type { FastifyReply, FastifyRequest } from "fastify"

export const sessionCookieName = "specraft_session"

export function setSessionCookie(reply: FastifyReply, memberId: string): void {
  reply.setCookie(sessionCookieName, memberId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    signed: true,
  })
}

export function readSessionMemberId(request: FastifyRequest): string | null {
  const cookie = request.cookies[sessionCookieName]
  if (!cookie) {
    return null
  }
  const unsigned = request.unsignCookie(cookie)
  return unsigned.valid ? unsigned.value : null
}
