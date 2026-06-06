import { createSpecraftClient } from "@specraft/shared"

import { handleMcpRequest, type McpTool } from "./mcp.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function main(): Promise<void> {
  const serverUrl = process.env["SPECRAFT_SERVER_URL"]
  const apiKey = process.env["SPECRAFT_API_KEY"]
  if (!serverUrl || !apiKey) {
    throw new Error("SPECRAFT_SERVER_URL and SPECRAFT_API_KEY are required")
  }
  const client = createSpecraftClient({ baseUrl: serverUrl, apiKey })
  const tools: readonly McpTool[] = [
    {
      name: "specraft_status",
      description: "Read specraft server status.",
      call: () => client.status(),
    },
  ]
  const input = JSON.parse(await readStdin())
  process.stdout.write(`${JSON.stringify(await handleMcpRequest(tools, input))}\n`)
}

await main()
