import cookie from "@fastify/cookie"
import type { StatusResponse } from "@specraft/shared"
import { StatusResponseSchema } from "@specraft/shared"
import type { FastifyInstance } from "fastify"
import fastify from "fastify"

import { registerAuthRoutes } from "./auth/routes.js"
import { loadServerConfig } from "./config/secrets.js"
import { createDatabase, type SpecraftDatabase } from "./storage/database.js"

export type BuildServerOptions = {
  readonly database?: SpecraftDatabase
  readonly secret?: string
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = fastify({ logger: false })
  const secret =
    options.secret ??
    loadServerConfig({ SPECRAFT_SECRET: "test-secret-0123456789abcdef" }).sessionSecret
  const database = options.database ?? createDatabase({ path: ":memory:" })

  void server.register(cookie, { secret })
  registerAuthRoutes(server, { database })

  server.get("/health", async () => ({ status: "ok" }))
  server.get("/api/v1/status", async () => {
    const response: StatusResponse = {
      server: "ok",
      branch_locks: [],
      wiki_head_by_branch: {},
    }
    return StatusResponseSchema.parse(response)
  })

  return server
}
