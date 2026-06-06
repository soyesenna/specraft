import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import { describe, expect, it } from "vitest"

import { OpenRouterProvider } from "./openrouter.js"

describe("OpenRouterProvider", () => {
  it("sends chat completions requests with bearer auth and returns assistant messages", async () => {
    const server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on("data", (chunk: Buffer) => chunks.push(chunk))
      request.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"))
        expect(request.url).toBe("/api/v1/chat/completions")
        expect(request.headers.authorization).toBe("Bearer test-key")
        expect(body).toEqual({
          model: "openrouter/auto",
          messages: [{ role: "user", content: "hello" }],
          tools: [],
        })
        response.setHeader("Content-Type", "application/json")
        response.end(
          JSON.stringify({
            choices: [{ message: { role: "assistant", content: "hello from openrouter" } }],
          }),
        )
      })
    })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address()
    if (typeof address === "string" || address === null) {
      throw new Error("expected TCP server address")
    }
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: `http://127.0.0.1:${(address satisfies AddressInfo).port}`,
      model: "openrouter/auto",
    })

    const result = await provider.complete({
      messages: [{ role: "user", content: "hello" }],
      tools: [],
    })

    expect(result).toEqual({ role: "assistant", content: "hello from openrouter" })
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  })
})
