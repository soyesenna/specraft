import {
  type IngestPayload,
  IngestPayloadSchema,
  type IngestResponse,
  type QueryResponse,
  type StatusResponse,
} from "@specraft/shared"
import { z } from "zod"

import { recordDefer } from "./defer-state.js"
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
  /** null = safe mode (no session id available): local session markers are skipped. */
  readonly sessionId: string | null
  readonly home: string
  readonly gitSnapshot: () => Promise<GitSnapshot>
  readonly headPushed?: () => Promise<boolean> | boolean
  readonly repoRoot?: () => Promise<string> | string
}

export const QueryToolInputSchema = z.object({ question: z.string().min(1) })
export const DeferToolInputSchema = z.object({ reason: z.string().min(1) })
export const IngestToolInputSchema = IngestPayloadSchema.omit({
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
  if (context.headPushed && !(await context.headPushed())) {
    throw new Error("HEAD is not pushed; push before specraft_ingest")
  }
  const snapshot = await context.gitSnapshot()
  const response = await context.client.ingest({
    ...input,
    branch: snapshot.branch,
    commit_hash: snapshot.head,
    session_id: context.sessionId ?? "safe-mode",
  })
  if (response.status === "accepted" && context.sessionId !== null) {
    markIngested(context.home, context.sessionId)
  }
  return response
}

export type DeferResult = {
  readonly status: "deferred"
  readonly repo_path: string
  readonly branch: string
  readonly head: string
  readonly reason: string
}

export async function specraftDefer(
  context: ToolContext,
  input: { readonly reason: string },
): Promise<DeferResult> {
  if (!context.repoRoot) {
    throw new Error("git repo root is unavailable; specraft_defer requires repository context")
  }
  const snapshot = await context.gitSnapshot()
  const marker = recordDefer(
    context.home,
    { branch: snapshot.branch, head: snapshot.head, repoPath: await context.repoRoot() },
    input.reason,
  )
  return {
    status: "deferred",
    repo_path: marker.repo_path,
    branch: marker.branch,
    head: marker.head,
    reason: marker.reason,
  }
}

export async function specraftStatus(context: ToolContext): Promise<StatusResponse> {
  return context.client.status()
}
