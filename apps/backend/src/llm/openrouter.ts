import http from "node:http"
import https from "node:https"

import { z } from "zod"

import type { AssistantMessage, ChatMessage, CompletionRequest, LLMProvider } from "./provider.js"

const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
})

const CompletionResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal("assistant"),
        content: z.string().nullable(),
        tool_calls: z.array(ToolCallSchema).optional(),
      }),
    }),
  ),
})

export type OpenRouterProviderOptions = {
  readonly apiKey: string
  readonly model: string
  readonly baseUrl?: string
  readonly referer?: string
  readonly title?: string
}

export class OpenRouterResponseError extends Error {
  constructor(statusCode: number, body: string) {
    super(`OpenRouter request failed with ${statusCode}: ${body}`)
  }
}

export class OpenRouterProvider implements LLMProvider {
  readonly #options: OpenRouterProviderOptions

  constructor(options: OpenRouterProviderOptions) {
    this.#options = options
  }

  async complete(request: CompletionRequest): Promise<AssistantMessage> {
    const response = await requestJson(
      new URL("/api/v1/chat/completions", this.#options.baseUrl ?? "https://openrouter.ai"),
      headersFor(this.#options),
      {
        model: this.#options.model,
        messages: request.messages,
        tools: request.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: { type: "object", additionalProperties: true },
          },
        })),
      },
    )
    const first = CompletionResponseSchema.parse(response).choices[0]
    if (!first) {
      throw new OpenRouterResponseError(200, "missing choices")
    }
    return normalizeAssistantMessage(first.message)
  }
}

function headersFor(options: OpenRouterProviderOptions): Record<string, string> {
  return {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
    ...(options.referer ? { "HTTP-Referer": options.referer } : {}),
    ...(options.title ? { "X-OpenRouter-Title": options.title } : {}),
  }
}

function normalizeAssistantMessage(message: {
  readonly role: "assistant"
  readonly content: string | null
  readonly tool_calls?: readonly z.infer<typeof ToolCallSchema>[] | undefined
}): AssistantMessage {
  return message.tool_calls
    ? { role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls }
    : { role: "assistant", content: message.content ?? "" }
}

function requestJson(url: URL, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const payload = JSON.stringify(body)
  const transport = url.protocol === "http:" ? http : https
  return new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": String(Buffer.byteLength(payload)) },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on("data", (chunk: Buffer) => chunks.push(chunk))
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          if ((response.statusCode ?? 500) >= 400) {
            reject(new OpenRouterResponseError(response.statusCode ?? 500, text))
            return
          }
          resolve(JSON.parse(text))
        })
      },
    )
    request.on("error", reject)
    request.end(payload)
  })
}

export function openRouterMessages(messages: readonly ChatMessage[]): readonly ChatMessage[] {
  return messages
}
