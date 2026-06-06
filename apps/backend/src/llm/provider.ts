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

export interface LLMProvider {
  readonly complete: (request: CompletionRequest) => Promise<AssistantMessage>
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
  readonly maxTurns: number
}): Promise<AssistantMessage> {
  let messages: readonly ChatMessage[] = input.messages
  for (let turn = 0; turn < input.maxTurns; turn += 1) {
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
  throw new ToolLoopExceededError(input.maxTurns)
}
