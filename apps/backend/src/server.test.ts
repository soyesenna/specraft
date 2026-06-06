import { StatusResponseSchema } from "@specraft/shared"
import { describe, expect, it } from "vitest"

import { buildServer } from "./server.js"

describe("backend skeleton", () => {
  it("serves health and status skeleton", async () => {
    const server = buildServer()

    const health = await server.inject({ method: "GET", url: "/health" })
    const status = await server.inject({ method: "GET", url: "/api/v1/status" })

    expect(health.statusCode).toBe(200)
    expect(health.json()).toEqual({ status: "ok" })
    expect(status.statusCode).toBe(200)
    expect(StatusResponseSchema.parse(status.json())).toEqual({
      server: "ok",
      branch_locks: [],
      wiki_head_by_branch: {},
    })

    await server.close()
  })
})
