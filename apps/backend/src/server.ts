import cookie from "@fastify/cookie"
import type { FastifyInstance } from "fastify"
import fastify from "fastify"

import { registerAuthRoutes } from "./auth/routes.js"
import { loadServerConfig } from "./config/secrets.js"
import type { LLMProvider } from "./llm/provider.js"
import { registerSpecRoutes } from "./spec/routes.js"
import { createDatabase, type SpecraftDatabase } from "./storage/database.js"

export type BuildServerOptions = {
  readonly database?: SpecraftDatabase
  readonly secret?: string
  readonly credentialKey?: string
  readonly dataDir?: string
  readonly codeRemoteUrl?: string
  readonly llmProvider?: LLMProvider
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const server = fastify({ logger: false })
  const fallbackConfig = loadServerConfig({ SPECRAFT_SECRET: "test-secret-0123456789abcdef" })
  const secret = options.secret ?? fallbackConfig.sessionSecret
  const credentialKey = options.credentialKey ?? fallbackConfig.credentialKey
  const database = options.database ?? createDatabase({ path: ":memory:" })

  void server.register(cookie, { secret })
  registerAuthRoutes(server, { credentialKey, database })
  registerSpecRoutes(server, {
    database,
    ...(options.dataDir ? { dataDir: options.dataDir } : {}),
    ...(options.codeRemoteUrl ? { codeRemoteUrl: options.codeRemoteUrl } : {}),
    ...(options.llmProvider ? { llmProvider: options.llmProvider } : {}),
  })

  server.get("/health", async () => ({ status: "ok" }))

  return server
}
