import {
  type ConflictListResponse,
  type ContextResponse,
  type IngestPayload,
  IngestPayloadSchema,
  type IngestResponse,
  type QueryResponse,
  type StatusResponse,
  type WikiHistoryResponse,
  type WikiPageResponse,
  type WikiTreeResponse,
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
  readonly context: (request: {
    readonly branch: string
    readonly commit_hash: string
  }) => Promise<ContextResponse>
  readonly wikiPage: (request: {
    readonly branch: string
    readonly path: string
  }) => Promise<WikiPageResponse>
  readonly wikiTree: (request: { readonly branch: string }) => Promise<WikiTreeResponse>
  readonly wikiHistory: (request: {
    readonly branch: string
    readonly path: string
  }) => Promise<WikiHistoryResponse>
  readonly listConflicts: () => Promise<ConflictListResponse>
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
export const ReadPageToolInputSchema = z.object({ path: z.string().min(1) })
export const HistoryToolInputSchema = z.object({
  path: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
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

/** 위키 페이지 전문을 읽는다 — branch는 현재 git 스냅샷에 자동 바인딩된다. */
export async function specraftReadPage(
  context: ToolContext,
  input: { readonly path: string },
): Promise<WikiPageResponse> {
  const snapshot = await context.gitSnapshot()
  return context.client.wikiPage({ branch: snapshot.branch, path: input.path })
}

/** 현재 브랜치 위키의 페이지 트리를 나열한다. */
export async function specraftTree(context: ToolContext): Promise<WikiTreeResponse> {
  const snapshot = await context.gitSnapshot()
  return context.client.wikiTree({ branch: snapshot.branch })
}

/** 위키 페이지의 변경 이력을 조회한다 — limit은 프록시에서 최신순 절단한다(백엔드 무변경). */
export async function specraftHistory(
  context: ToolContext,
  input: { readonly path: string; readonly limit?: number | undefined },
): Promise<WikiHistoryResponse> {
  const snapshot = await context.gitSnapshot()
  const response = await context.client.wikiHistory({ branch: snapshot.branch, path: input.path })
  if (input.limit === undefined) {
    return response
  }
  return { ...response, versions: response.versions.slice(0, input.limit) }
}

/** 열린 spec 충돌(branch lock) 목록을 조회한다. */
export async function specraftConflicts(context: ToolContext): Promise<ConflictListResponse> {
  return context.client.listConflicts()
}

/** 세션 컨텍스트(overview+index)를 수동 재수화한다 — 훅 미지원 호스트의 폴백 경로. */
export async function specraftContext(context: ToolContext): Promise<ContextResponse> {
  const snapshot = await context.gitSnapshot()
  return context.client.context({ branch: snapshot.branch, commit_hash: snapshot.head })
}
