import {
  ContextRequestSchema,
  ContextResponseSchema,
  GraphLayoutResponseSchema,
  GraphLayoutSaveRequestSchema,
  GraphLayoutSaveResponseSchema,
  IngestLogDetailSchema,
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
  QueryLogDetailSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  StatusResponseSchema,
  WikiGraphResponseSchema,
  WikiHistoryResponseSchema,
  WikiPageResponseSchema,
  WikiTreeResponseSchema,
} from "@specraft/shared"
import type { FastifyInstance, FastifyReply } from "fastify"
import { z } from "zod"
import { getSetting } from "../auth/store.js"
import { BranchQueue } from "../git/branch-queue.js"
import {
  branchLock,
  commitExists,
  createCodeMirror,
  createSkeletonWiki,
  listBranchLocks,
  listWikiFiles,
  readWikiFile,
  type WikiRepository,
  wikiHead,
} from "../git/sync.js"
import { isSafeBranchName, isSafeWikiPath } from "../git/validation.js"
import { sendValidationFailed } from "../http/errors.js"
import type { LLMProvider } from "../llm/provider.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { requireMember } from "./auth.js"
import { registerConflictRoutes } from "./conflict-routes.js"
import { fitContextToBudget } from "./context-budget.js"
import { cachedWikiGraph } from "./graph-cache.js"
import { getGraphLayout, saveGraphLayout } from "./layouts.js"
import {
  getIngestLogDetail,
  getQueryLogDetail,
  listIngestLogs,
  listQueryLogs,
  recordIngestLog,
  recordQueryLog,
  updateQueryLogResult,
} from "./logs.js"
import {
  answerWikiQuestionWithAgent,
  answerWikiQuestionWithAgentStream,
  ingestWikiWithAgent,
} from "./wiki-agent.js"
import { buildWikiHistory } from "./wiki-history.js"

export type SpecRouteContext = {
  readonly database: SpecraftDatabase
  readonly dataDir?: string
  readonly codeRemoteUrl?: string
  readonly branchQueue?: BranchQueue
  readonly llmProvider?: LLMProvider
}

const BranchNameSchema = z.string().min(1).refine(isSafeBranchName)
const BranchParamsSchema = z.object({ branch: BranchNameSchema })
const WikiPageQuerySchema = z.object({ path: z.string().min(1).refine(isSafeWikiPath) })
const LogIdParamsSchema = z.object({ id: z.string().min(1) })

function wikiFor(context: SpecRouteContext, branch: string): WikiRepository | null {
  return context.dataDir ? createSkeletonWiki({ dataDir: context.dataDir, branch }) : null
}

function ensureUnlocked(context: SpecRouteContext, branch: string, reply: FastifyReply): boolean {
  const lock = branchLock(context.database, branch)
  if (!lock) {
    return true
  }
  reply.status(409).send({ error: "branch_locked", conflict_id: lock.conflict_id })
  return false
}

function commitIsKnown(context: SpecRouteContext, commitHash: string): boolean {
  const remoteUrl = context.codeRemoteUrl ?? getSetting(context.database, "git_remote_url")
  if (!remoteUrl || !context.dataDir) {
    return false
  }
  const mirror = createCodeMirror({ dataDir: context.dataDir, remoteUrl })
  return commitExists(mirror, commitHash)
}

export function registerSpecRoutes(server: FastifyInstance, context: SpecRouteContext): void {
  const branchQueue = context.branchQueue ?? new BranchQueue()

  server.post("/api/v1/context", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = ContextRequestSchema.safeParse(request.body)
    if (!parsed.success || !isSafeBranchName(parsed.data.branch)) {
      return sendValidationFailed(reply)
    }
    if (!ensureUnlocked(context, parsed.data.branch, reply)) {
      return reply
    }
    const wiki = wikiFor(context, parsed.data.branch)
    const overview = wiki ? readWikiFile(wiki, "overview.md") : ""
    const index = wiki ? readWikiFile(wiki, "index.md") : ""
    // M3.6: budget_tokens 지정 시에만 예산 적용 — 미지정 시 현행(무제한) 동작 유지.
    const fitted =
      parsed.data.budget_tokens === undefined
        ? undefined
        : await fitContextToBudget({
            overview,
            index,
            budgetTokens: parsed.data.budget_tokens,
            provider: context.llmProvider,
          })
    const response = {
      overview: fitted ? fitted.overview : overview,
      index,
      branch_status: { state: "ready" },
      wiki_head: wiki ? wikiHead(wiki) : "uninitialized",
      ...(fitted ? { truncated: fitted.truncated } : {}),
    }
    return ContextResponseSchema.parse(response)
  })

  server.post("/api/v1/query", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = QueryRequestSchema.safeParse(request.body)
    if (!parsed.success || !isSafeBranchName(parsed.data.branch)) {
      return sendValidationFailed(reply)
    }
    if (!ensureUnlocked(context, parsed.data.branch, reply)) {
      return reply
    }
    const wiki = wikiFor(context, parsed.data.branch)
    const queryId = recordQueryLog(context.database, {
      branch: parsed.data.branch,
      memberId: member.id,
      question: parsed.data.question,
    })
    const result = QueryResponseSchema.parse(
      wiki
        ? await answerWikiQuestionWithAgent({
            provider: context.llmProvider,
            queryId,
            question: parsed.data.question,
            wiki,
          })
        : { answer: "", citations: [], query_id: queryId },
    )
    updateQueryLogResult(context.database, {
      queryId,
      answer: result.answer,
      citations: result.citations,
      toolCalls: [],
    })
    return result
  })

  server.post("/api/v1/query/stream", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = QueryRequestSchema.safeParse(request.body)
    if (!parsed.success || !isSafeBranchName(parsed.data.branch)) {
      return sendValidationFailed(reply)
    }
    if (!ensureUnlocked(context, parsed.data.branch, reply)) {
      return reply
    }
    const wiki = wikiFor(context, parsed.data.branch)
    const queryId = recordQueryLog(context.database, {
      branch: parsed.data.branch,
      memberId: member.id,
      question: parsed.data.question,
    })
    reply.hijack()
    const raw = reply.raw
    raw.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    })
    const send = (event: string, data: unknown): void => {
      raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
    // 도구 타임라인 누적: 호출 시 result=null로 push, 결과 도착 시 짝을 맞춰 채운다.
    const toolCalls: { name: string; arguments: string; result: string | null }[] = []
    try {
      if (!wiki) {
        send("done", { answer: "", citations: [], query_id: queryId })
        return
      }
      const result = await answerWikiQuestionWithAgentStream({
        onDelta: (text) => send("delta", { text }),
        onToolCall: (call) => {
          send("tool_call", call)
          toolCalls.push({ name: call.name, arguments: call.arguments, result: null })
        },
        onToolResult: (toolResult) => {
          send("tool_result", {
            name: toolResult.name,
            result: toolResult.result.slice(0, 2000),
          })
          const pending = toolCalls.find(
            (call) => call.result === null && call.name === toolResult.name,
          )
          if (pending) {
            pending.result = toolResult.result
          } else {
            toolCalls.push({ name: toolResult.name, arguments: "", result: toolResult.result })
          }
        },
        provider: context.llmProvider,
        queryId,
        question: parsed.data.question,
        wiki,
      })
      const response = QueryResponseSchema.parse(result)
      send("done", response)
      updateQueryLogResult(context.database, {
        queryId,
        answer: response.answer,
        citations: response.citations,
        toolCalls,
      })
    } catch (error) {
      send("error", { message: error instanceof Error ? error.message : "query failed" })
    } finally {
      raw.end()
    }
    return reply
  })

  server.post("/api/v1/ingest", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = IngestPayloadSchema.safeParse(request.body)
    if (!parsed.success || !isSafeBranchName(parsed.data.branch)) {
      return sendValidationFailed(reply)
    }
    if (!ensureUnlocked(context, parsed.data.branch, reply)) {
      return reply
    }
    return branchQueue.run(parsed.data.branch, async () => {
      if (!ensureUnlocked(context, parsed.data.branch, reply)) {
        return reply
      }
      if (!commitIsKnown(context, parsed.data.commit_hash)) {
        recordIngestLog(context.database, {
          branch: parsed.data.branch,
          commitHash: parsed.data.commit_hash,
          memberId: member.id,
          status: "rejected",
          summary: parsed.data.summary,
          specChanges: parsed.data.spec_changes,
          progressUpdates: parsed.data.progress_updates,
          openQuestions: parsed.data.open_questions,
        })
        return reply.status(422).send({ status: "rejected", reason: "commit_not_found" })
      }
      const wiki = wikiFor(context, parsed.data.branch)
      const wikiCommit = wiki
        ? await ingestWikiWithAgent({
            member,
            payload: parsed.data,
            provider: context.llmProvider,
            wiki,
          })
        : undefined
      const logInput = {
        branch: parsed.data.branch,
        commitHash: parsed.data.commit_hash,
        memberId: member.id,
        status: "accepted",
        summary: parsed.data.summary,
        specChanges: parsed.data.spec_changes,
        progressUpdates: parsed.data.progress_updates,
        openQuestions: parsed.data.open_questions,
      } as const
      recordIngestLog(context.database, wikiCommit ? { ...logInput, wikiCommit } : logInput)
      return IngestResponseSchema.parse(
        wikiCommit ? { status: "accepted", wiki_commit: wikiCommit } : { status: "accepted" },
      )
    })
  })

  server.get("/api/v1/logs/ingests", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return IngestLogListResponseSchema.parse(listIngestLogs(context.database))
  })

  server.get("/api/v1/logs/queries", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return QueryLogListResponseSchema.parse(listQueryLogs(context.database))
  })

  server.get("/api/v1/logs/ingests/:id", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = LogIdParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const detail = getIngestLogDetail(context.database, parsed.data.id)
    if (!detail) {
      return reply.status(404).send({ error: "not_found" })
    }
    return IngestLogDetailSchema.parse(detail)
  })

  server.get("/api/v1/logs/queries/:id", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = LogIdParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const detail = getQueryLogDetail(context.database, parsed.data.id)
    if (!detail) {
      return reply.status(404).send({ error: "not_found" })
    }
    return QueryLogDetailSchema.parse(detail)
  })

  server.get("/api/v1/wiki/:branch/tree", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = BranchParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, parsed.data.branch)
    const files = wiki ? listWikiFiles(wiki) : []
    return WikiTreeResponseSchema.parse({
      branch: parsed.data.branch,
      entries: files.map((path) => ({ path, type: "file" })),
    })
  })

  server.get("/api/v1/wiki/:branch/page", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = BranchParamsSchema.safeParse(request.params)
    const query = WikiPageQuerySchema.safeParse(request.query)
    if (!params.success || !query.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, params.data.branch)
    return WikiPageResponseSchema.parse({
      branch: params.data.branch,
      content: wiki ? readWikiFile(wiki, query.data.path) : "",
      path: query.data.path,
    })
  })

  server.get("/api/v1/wiki/:branch/graph", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = BranchParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, parsed.data.branch)
    return WikiGraphResponseSchema.parse(
      wiki
        ? cachedWikiGraph(context.database, wiki, parsed.data.branch)
        : { branch: parsed.data.branch, nodes: [], edges: [] },
    )
  })

  // 사용자별 그래프 노드 배치 — 멤버×브랜치 단위로 저장/조회한다.
  server.get("/api/v1/wiki/:branch/layout", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = BranchParamsSchema.safeParse(request.params)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    return GraphLayoutResponseSchema.parse({
      branch: parsed.data.branch,
      positions: getGraphLayout(context.database, member.id, parsed.data.branch),
    })
  })

  server.put("/api/v1/wiki/:branch/layout", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = BranchParamsSchema.safeParse(request.params)
    const body = GraphLayoutSaveRequestSchema.safeParse(request.body)
    if (!params.success || !body.success || body.data.branch !== params.data.branch) {
      return sendValidationFailed(reply)
    }
    saveGraphLayout(context.database, {
      memberId: member.id,
      branch: params.data.branch,
      positions: body.data.positions,
    })
    return GraphLayoutSaveResponseSchema.parse({ status: "ok" })
  })

  server.get("/api/v1/wiki/:branch/history", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = BranchParamsSchema.safeParse(request.params)
    const query = WikiPageQuerySchema.safeParse(request.query)
    if (!params.success || !query.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, params.data.branch)
    return WikiHistoryResponseSchema.parse(
      wiki
        ? buildWikiHistory(wiki, params.data.branch, query.data.path)
        : { branch: params.data.branch, path: query.data.path, versions: [] },
    )
  })

  registerConflictRoutes(server, context)

  server.get("/api/v1/status", async () => {
    const headByBranch: Record<string, string> = {}
    const main = wikiFor(context, "main")
    if (main) {
      headByBranch[main.branch] = wikiHead(main)
    }
    return StatusResponseSchema.parse({
      server: "ok",
      branch_locks: listBranchLocks(context.database),
      wiki_head_by_branch: headByBranch,
    })
  })
}
