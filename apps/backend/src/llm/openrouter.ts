import http from "node:http"
import https from "node:https"

import { z } from "zod"

import type {
  AssistantMessage,
  ChatMessage,
  CompletionRequest,
  LLMProvider,
  StreamHandlers,
} from "./provider.js"

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
    const response = await requestJson(this.#endpoint(), headersFor(this.#options), {
      model: this.#options.model,
      messages: request.messages,
      tools: toolPayload(request.tools),
    })
    const first = CompletionResponseSchema.parse(response).choices[0]
    if (!first) {
      throw new OpenRouterResponseError(200, "missing choices")
    }
    return normalizeAssistantMessage(first.message)
  }

  async completeStream(
    request: CompletionRequest,
    handlers: StreamHandlers,
  ): Promise<AssistantMessage> {
    return requestStream(
      this.#endpoint(),
      headersFor(this.#options),
      {
        model: this.#options.model,
        messages: request.messages,
        tools: toolPayload(request.tools),
        stream: true,
      },
      handlers.onDelta,
    )
  }

  #endpoint(): URL {
    return new URL("/api/v1/chat/completions", this.#options.baseUrl ?? "https://openrouter.ai")
  }
}

function toolPayload(tools: CompletionRequest["tools"]): unknown {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toToolParameters(tool.parameters),
    },
  }))
}

function toToolParameters(parameters: unknown): unknown {
  if (parameters instanceof z.ZodType) {
    return z.toJSONSchema(parameters)
  }
  return { type: "object", additionalProperties: true }
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

type StreamToolCallDelta = {
  readonly index?: number
  readonly id?: string
  readonly function?: { readonly name?: string; readonly arguments?: string }
}

type StreamChunk = {
  readonly choices?: ReadonlyArray<{
    readonly delta?: {
      readonly content?: string | null
      readonly tool_calls?: ReadonlyArray<StreamToolCallDelta>
    }
  }>
}

type ToolCallAccumulator = { id: string; name: string; arguments: string }

/** OpenRouter SSE 스트림을 읽어 content 델타를 흘리고, 누적된 최종 메시지를 반환한다. */
function requestStream(
  url: URL,
  headers: Record<string, string>,
  body: unknown,
  onDelta: (text: string) => void,
): Promise<AssistantMessage> {
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
        const status = response.statusCode ?? 500
        if (status >= 400) {
          const chunks: Buffer[] = []
          response.on("data", (chunk: Buffer) => chunks.push(chunk))
          response.on("end", () =>
            reject(new OpenRouterResponseError(status, Buffer.concat(chunks).toString("utf8"))),
          )
          response.on("error", reject)
          return
        }
        let content = ""
        let buffer = ""
        const toolCalls = new Map<number, ToolCallAccumulator>()
        response.setEncoding("utf8")
        response.on("data", (chunk: string) => {
          buffer += chunk
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            const delta = parseSseData(line)?.choices?.[0]?.delta
            if (!delta) {
              continue
            }
            if (typeof delta.content === "string" && delta.content.length > 0) {
              content += delta.content
              onDelta(delta.content)
            }
            if (delta.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                accumulateToolCall(toolCalls, toolCall)
              }
            }
          }
        })
        response.on("end", () => resolve(buildStreamedMessage(content, toolCalls)))
        response.on("error", reject)
      },
    )
    request.on("error", reject)
    request.end(payload)
  })
}

function parseSseData(line: string): StreamChunk | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("data:")) {
    return null
  }
  const data = trimmed.slice("data:".length).trim()
  if (data === "" || data === "[DONE]") {
    return null
  }
  try {
    return JSON.parse(data) as StreamChunk
  } catch {
    return null
  }
}

function accumulateToolCall(
  map: Map<number, ToolCallAccumulator>,
  delta: StreamToolCallDelta,
): void {
  const index = typeof delta.index === "number" ? delta.index : 0
  const accumulator = map.get(index) ?? { id: "", name: "", arguments: "" }
  if (typeof delta.id === "string") {
    accumulator.id = delta.id
  }
  if (delta.function?.name) {
    accumulator.name = delta.function.name
  }
  if (typeof delta.function?.arguments === "string") {
    accumulator.arguments += delta.function.arguments
  }
  map.set(index, accumulator)
}

function buildStreamedMessage(
  content: string,
  toolCalls: Map<number, ToolCallAccumulator>,
): AssistantMessage {
  if (toolCalls.size === 0) {
    return { role: "assistant", content }
  }
  const calls = [...toolCalls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, accumulator]) => ({
      id: accumulator.id,
      type: "function" as const,
      function: { name: accumulator.name, arguments: accumulator.arguments },
    }))
  return { role: "assistant", content, tool_calls: calls }
}

export function openRouterMessages(messages: readonly ChatMessage[]): readonly ChatMessage[] {
  return messages
}
