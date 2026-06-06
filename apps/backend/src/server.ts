import cookie from "@fastify/cookie"
import type { FastifyInstance } from "fastify"
import fastify from "fastify"

import { registerAuthRoutes } from "./auth/routes.js"
import { loadServerConfig } from "./config/secrets.js"
import { registerSpecRoutes } from "./spec/routes.js"
import { createDatabase, type SpecraftDatabase } from "./storage/database.js"

export type BuildServerOptions = {
  readonly database?: SpecraftDatabase
  readonly secret?: string
  readonly dataDir?: string
  readonly codeRemoteUrl?: string
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = fastify({ logger: false })
  const secret =
    options.secret ??
    loadServerConfig({ SPECRAFT_SECRET: "test-secret-0123456789abcdef" }).sessionSecret
  const database = options.database ?? createDatabase({ path: ":memory:" })

  void server.register(cookie, { secret })
  registerAuthRoutes(server, { database })
  registerSpecRoutes(server, {
    database,
    ...(options.dataDir ? { dataDir: options.dataDir } : {}),
    ...(options.codeRemoteUrl ? { codeRemoteUrl: options.codeRemoteUrl } : {}),
  })

  server.get("/health", async () => ({ status: "ok" }))

  return server
}
