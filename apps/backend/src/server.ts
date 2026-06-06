import type { StatusResponse } from "@specraft/shared"
import { StatusResponseSchema } from "@specraft/shared"

import type { FastifyInstance } from "fastify"
import fastify from "fastify"

export function buildServer(): FastifyInstance {
  const server = fastify({ logger: false })

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
