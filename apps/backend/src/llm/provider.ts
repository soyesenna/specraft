export type ToolCall = {
  readonly id: string
  readonly type: "function"
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

export type ChatMessage =
  | { readonly role: "system" | "user"; readonly content: string }
  | {
      readonly role: "assistant"
      readonly content: string
      readonly tool_calls?: readonly ToolCall[]
    }
  | { readonly role: "tool"; readonly content: string; readonly tool_call_id: string }

export type AssistantMessage = Extract<ChatMessage, { readonly role: "assistant" }>

export type ToolDefinition = {
  readonly name: string
  readonly description: string
  readonly parameters: unknown
  readonly execute: (input: unknown) => Promise<string> | string
}

export type CompletionRequest = {
  readonly messages: readonly ChatMessage[]
  readonly tools: readonly ToolDefinition[]
}

/** 스트리밍 완료 중 토큰 델타가 도착할 때마다 호출되는 콜백. */
export type StreamHandlers = {
  readonly onDelta: (text: string) => void
}

export interface LLMProvider {
  readonly complete: (request: CompletionRequest) => Promise<AssistantMessage>
  /** SSE 스트리밍 완료. 미구현 provider는 runToolLoopStream에서 complete로 폴백한다. */
  readonly completeStream?: (
    request: CompletionRequest,
    handlers: StreamHandlers,
  ) => Promise<AssistantMessage>
}

export class ToolLoopExceededError extends Error {
  constructor(maxTurns: number) {
    super(`tool loop exceeded ${maxTurns} turns`)
  }
}

export class ToolNotFoundError extends Error {
  constructor(toolName: string) {
    super(`tool not found: ${toolName}`)
  }
}

export class MockProvider implements LLMProvider {
  readonly requests: CompletionRequest[] = []
  readonly #responses: readonly AssistantMessage[]
  #index = 0

  constructor(responses: readonly AssistantMessage[]) {
    this.#responses = responses
  }

  async complete(request: CompletionRequest): Promise<AssistantMessage> {
    this.requests.push(request)
    const response = this.#responses[this.#index]
    this.#index += 1
    if (!response) {
      throw new ToolLoopExceededError(this.#responses.length)
    }
    return response
  }
}

function parseToolArguments(serialized: string): unknown {
  try {
    return JSON.parse(serialized)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {}
    }
    throw error
  }
}

export async function runToolLoop(input: {
  readonly provider: LLMProvider
  readonly messages: readonly ChatMessage[]
  readonly tools: readonly ToolDefinition[]
  // 미지정 시 도구 루프에 턴 제한을 두지 않는다(모델이 최종 답변을 낼 때까지 반복).
  readonly maxTurns?: number
}): Promise<AssistantMessage> {
  let messages: readonly ChatMessage[] = input.messages
  for (let turn = 0; input.maxTurns === undefined || turn < input.maxTurns; turn += 1) {
    const response = await input.provider.complete({ messages, tools: input.tools })
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response
    }
    const toolMessages: ChatMessage[] = []
    for (const call of response.tool_calls) {
      const tool = input.tools.find((candidate) => candidate.name === call.function.name)
      if (!tool) {
        throw new ToolNotFoundError(call.function.name)
      }
      const result = await tool.execute(parseToolArguments(call.function.arguments))
      toolMessages.push({ role: "tool", content: result, tool_call_id: call.id })
    }
    messages = [...messages, response, ...toolMessages]
  }
  throw new ToolLoopExceededError(input.maxTurns ?? 0)
}

export type StreamToolCall = { readonly name: string; readonly arguments: string }
export type StreamToolResult = { readonly name: string; readonly result: string }

/**
 * 스트리밍 tool loop. 텍스트 델타는 흐르는 그대로 onDelta로 보존하고,
 * 도구 호출/결과는 onToolCall/onToolResult로 통지해 클라이언트가 단계 타임라인을 구성하게 한다.
 */
export async function runToolLoopStream(input: {
  readonly provider: LLMProvider
  readonly messages: readonly ChatMessage[]
  readonly tools: readonly ToolDefinition[]
  // 미지정 시 도구 루프에 턴 제한을 두지 않는다(모델이 최종 답변을 낼 때까지 반복).
  readonly maxTurns?: number
  readonly onDelta: (text: string) => void
  readonly onToolCall: (call: StreamToolCall) => void
  readonly onToolResult: (result: StreamToolResult) => void
}): Promise<AssistantMessage> {
  let messages: readonly ChatMessage[] = input.messages
  let lastResponse: AssistantMessage = { role: "assistant", content: "" }
  for (let turn = 0; input.maxTurns === undefined || turn < input.maxTurns; turn += 1) {
    // maxTurns 가 지정된 경우에만 마지막 turn에서 도구를 빼 답변을 강제한다.
    const finalTurn = input.maxTurns !== undefined && turn === input.maxTurns - 1
    const request: CompletionRequest = { messages, tools: finalTurn ? [] : input.tools }
    const response = input.provider.completeStream
      ? await input.provider.completeStream(request, { onDelta: input.onDelta })
      : await streamFromComplete(input.provider, request, input.onDelta)
    lastResponse = response
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response
    }
    const toolMessages: ChatMessage[] = []
    for (const call of response.tool_calls) {
      const tool = input.tools.find((candidate) => candidate.name === call.function.name)
      if (!tool) {
        throw new ToolNotFoundError(call.function.name)
      }
      input.onToolCall({ name: call.function.name, arguments: call.function.arguments })
      const result = await tool.execute(parseToolArguments(call.function.arguments))
      input.onToolResult({ name: call.function.name, result })
      toolMessages.push({ role: "tool", content: result, tool_call_id: call.id })
    }
    messages = [...messages, response, ...toolMessages]
  }
  // 도구 없는 마지막 turn에서도 답변이 비어 있는 극단적 경우의 안전망.
  return lastResponse
}

/** completeStream 미구현 provider용 폴백: 완성된 응답 content를 한 번에 델타로 흘린다. */
async function streamFromComplete(
  provider: LLMProvider,
  request: CompletionRequest,
  onDelta: (text: string) => void,
): Promise<AssistantMessage> {
  const response = await provider.complete(request)
  if (response.content.length > 0) {
    onDelta(response.content)
  }
  return response
}
