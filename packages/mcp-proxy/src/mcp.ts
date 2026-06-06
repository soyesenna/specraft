import { z } from "zod"

export type McpTool = {
  readonly name: string
  readonly description: string
  readonly call: (input: unknown) => Promise<unknown>
}

const RequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
})

export async function handleMcpRequest(
  tools: readonly McpTool[],
  requestBody: unknown,
): Promise<unknown> {
  const request = RequestSchema.parse(requestBody)
  if (request.method === "initialize") {
    return { jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2024-11-05" } }
  }
  if (request.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools: tools.map(({ name, description }) => ({ name, description })) },
    }
  }
  if (request.method === "tools/call") {
    const params = z
      .object({ name: z.string(), arguments: z.unknown().optional() })
      .parse(request.params)
    const tool = tools.find((candidate) => candidate.name === params.name)
    if (!tool) {
      return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "tool not found" } }
    }
    return { jsonrpc: "2.0", id: request.id, result: await tool.call(params.arguments ?? {}) }
  }
  return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method not found" } }
}
