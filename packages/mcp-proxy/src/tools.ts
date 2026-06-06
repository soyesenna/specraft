import {
  type IngestPayload,
  IngestPayloadSchema,
  type IngestResponse,
  type QueryResponse,
  type StatusResponse,
} from "@specraft/shared"
import { z } from "zod"

import type { McpTool } from "./mcp.js"
import { markIngested } from "./session-state.js"

export type SpecraftToolClient = {
  readonly query: (request: {
    readonly branch: string
    readonly commit_hash: string
    readonly question: string
  }) => Promise<QueryResponse>
  readonly ingest: (request: IngestPayload) => Promise<IngestResponse>
  readonly status: () => Promise<StatusResponse>
}

export type GitSnapshot = {
  readonly branch: string
  readonly head: string
}

export type ToolContext = {
  readonly client: SpecraftToolClient
  readonly sessionId: string
  readonly home: string
  readonly gitSnapshot: () => Promise<GitSnapshot>
}

const QueryToolInputSchema = z.object({ question: z.string().min(1) })
const IngestToolInputSchema = IngestPayloadSchema.omit({
  branch: true,
  commit_hash: true,
  session_id: true,
})

export async function specraftQuery(
  context: ToolContext,
  input: { readonly question: string },
): Promise<QueryResponse> {
  const snapshot = await context.gitSnapshot()
  return context.client.query({
    branch: snapshot.branch,
    commit_hash: snapshot.head,
    question: input.question,
  })
}

export async function specraftIngest(
  context: ToolContext,
  input: Omit<IngestPayload, "branch" | "commit_hash" | "session_id">,
): Promise<IngestResponse> {
  const snapshot = await context.gitSnapshot()
  const response = await context.client.ingest({
    ...input,
    branch: snapshot.branch,
    commit_hash: snapshot.head,
    session_id: context.sessionId,
  })
  if (response.status === "accepted") {
    markIngested(context.home, context.sessionId)
  }
  return response
}

export async function specraftStatus(context: ToolContext): Promise<StatusResponse> {
  return context.client.status()
}

export function createMcpTools(context: ToolContext): readonly McpTool[] {
  return [
    {
      name: "specraft_query",
      description: "Ask the specraft wiki a branch-aware question.",
      call: (input) => specraftQuery(context, QueryToolInputSchema.parse(input)),
    },
    {
      name: "specraft_ingest",
      description: "Ingest completed work into the specraft wiki.",
      call: (input) => specraftIngest(context, IngestToolInputSchema.parse(input)),
    },
    {
      name: "specraft_status",
      description: "Read specraft server status and branch locks.",
      call: () => specraftStatus(context),
    },
  ]
}
