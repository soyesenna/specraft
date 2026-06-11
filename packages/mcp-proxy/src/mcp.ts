import { readFileSync } from "node:fs"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"

import {
  DeferToolInputSchema,
  IngestToolInputSchema,
  QueryToolInputSchema,
  specraftDefer,
  specraftIngest,
  specraftQuery,
  specraftStatus,
  type ToolContext,
} from "./tools.js"

export const MCP_SERVER_NAME = "specraft"

const PackageManifestSchema = z.object({ version: z.string().min(1) })

/** Inlined at bundle time by the tsup `define` option (see tsup.config.ts). */
declare const __SPECRAFT_PROXY_VERSION__: string | undefined

export function mcpServerVersion(): string {
  // Single-file bundles cannot resolve ../package.json relative to import.meta.url,
  // so the bundle carries the version as a build-time constant instead.
  if (typeof __SPECRAFT_PROXY_VERSION__ === "string" && __SPECRAFT_PROXY_VERSION__ !== "") {
    return __SPECRAFT_PROXY_VERSION__
  }
  try {
    const manifest = PackageManifestSchema.parse(
      JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")),
    )
    return manifest.version
  } catch {
    return "0.0.0"
  }
}

function toToolResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload as Record<string, unknown>,
  }
}

export function createSpecraftMcpServer(context: ToolContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: mcpServerVersion() })
  server.registerTool(
    "specraft_query",
    {
      description: "Ask the specraft wiki a branch-aware question.",
      inputSchema: QueryToolInputSchema.shape,
    },
    async (input) => toToolResult(await specraftQuery(context, QueryToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_ingest",
    {
      description: "Ingest completed work into the specraft wiki.",
      inputSchema: IngestToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftIngest(context, IngestToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_status",
    { description: "Read specraft server status and branch locks." },
    async () => toToolResult(await specraftStatus(context)),
  )
  server.registerTool(
    "specraft_defer",
    {
      description:
        "Record a stop-gate defer marker for the current repo+branch+HEAD: the reason is logged and exactly one stop is allowed (consume-on-use). Works offline without the specraft server.",
      inputSchema: DeferToolInputSchema.shape,
    },
    async (input) => toToolResult(await specraftDefer(context, DeferToolInputSchema.parse(input))),
  )
  return server
}
