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
  ProgressBoardResponseSchema,
  QueryLogDetailSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  StatusResponseSchema,
  WikiChangesResponseSchema,
  WikiGraphResponseSchema,
  WikiHistoryResponseSchema,
  WikiMergeResponseSchema,
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
  type GitMirror,
  inferParentBranchFromCode,
  listBranchLocks,
  listWikiFiles,
  listWikiLastModified,
  readWikiFile,
  type WikiRepository,
  wikiBranchExists,
  wikiCommitExists,
  wikiHead,
} from "../git/sync.js"
import { isSafeBranchName, isSafeWikiPath } from "../git/validation.js"
import { createWikiBranchFromParent, mergeWikiBranch } from "../git/wiki-merge.js"
import { sendValidationFailed } from "../http/errors.js"
import type { EmbeddingProvider } from "../llm/embedding.js"
import type { LLMProvider } from "../llm/provider.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { requireAdmin, requireMember } from "./auth.js"
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
import { listFeatureProgress, upsertFeatureProgress } from "./progress.js"
import { indexChangedWikiPages, reindexWikiBranch, searchWiki } from "./search.js"
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
  readonly embeddingProvider?: EmbeddingProvider
}

const BranchNameSchema = z.string().min(1).refine(isSafeBranchName)
const BranchParamsSchema = z.object({ branch: BranchNameSchema })
const WikiPageQuerySchema = z.object({ path: z.string().min(1).refine(isSafeWikiPath) })
const LogIdParamsSchema = z.object({ id: z.string().min(1) })
const WikiChangesQuerySchema = z.object({ since: z.string().regex(/^[0-9a-f]{4,64}$/) })
const WikiMergeBodySchema = z.object({ into: BranchNameSchema })
const ProgressQuerySchema = z.object({ branch: BranchNameSchema.optional() })
const ReindexBodySchema = z.object({ branch: BranchNameSchema })

function codeMirrorFor(context: SpecRouteContext): GitMirror | null {
  const remoteUrl = context.codeRemoteUrl ?? getSetting(context.database, "git_remote_url")
  if (!remoteUrl || !context.dataDir) {
    return null
  }
  try {
    return createCodeMirror({ dataDir: context.dataDir, remoteUrl })
  } catch {
    return null // 원격 접근 실패는 parent 추정 실패로만 취급한다(요청 자체는 계속).
  }
}

function wikiFor(context: SpecRouteContext, branch: string): WikiRepository | null {
  if (!context.dataDir) {
    return null
  }
  /*
   * M4+.2 parent-aware 위키 분기 — 신규 위키 브랜치를 처음 만들 때 코드 미러의 merge-base로
   * 실제 parent 브랜치를 추정할 수 있으면 그 브랜치에서 분기한다. 추정 불가(미러 없음·
   * 코드 레포에 없는 브랜치·후보 없음)이면 기존과 동일하게 main에서 분기(createSkeletonWiki).
   * 존재 검사는 스폰 없는 loose-ref 읽기라 warm 요청 비용은 기존과 같다.
   */
  if (branch !== "main" && !wikiBranchExists(context.dataDir, branch)) {
    const mirror = codeMirrorFor(context)
    const parent = mirror ? inferParentBranchFromCode(mirror, branch) : null
    if (parent !== null && parent !== branch) {
      return createWikiBranchFromParent({ dataDir: context.dataDir, branch, parentBranch: parent })
    }
  }
  return createSkeletonWiki({ dataDir: context.dataDir, branch })
}

// steering.md처럼 실재할 때만 쓰는 페이지를 읽는다 — 부재(ENOENT)는 null.
function readWikiFileIfExists(wiki: WikiRepository, path: string): string | null {
  try {
    return readWikiFile(wiki, path)
  } catch {
    return null
  }
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
  const mirror = codeMirrorFor(context)
  return mirror !== null && commitExists(mirror, commitHash)
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
    // M4+.5 steering 주입: 위키에 steering.md가 실재하면 overview 앞에 블록으로 합친다
    // (응답 스키마 무변경). 예산 절단 시에도 보존 순서는 steering ≥ index > overview.
    const steering = wiki ? readWikiFileIfExists(wiki, "steering.md") : null
    const steeringBlock = steering === null ? undefined : `## Steering\n${steering.trim()}`
    // M3.6: budget_tokens 지정 시에만 예산 적용 — 미지정 시 현행(무제한) 동작 유지.
    const fitted =
      parsed.data.budget_tokens === undefined
        ? undefined
        : await fitContextToBudget({
            overview,
            index,
            steering: steeringBlock,
            budgetTokens: parsed.data.budget_tokens,
            provider: context.llmProvider,
          })
    const mergedOverview = fitted
      ? fitted.overview
      : steeringBlock === undefined
        ? overview
        : `${steeringBlock}\n\n${overview}`
    const response = {
      overview: mergedOverview,
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
      // M4+.4 증분 재인덱싱 기준점 — ingest가 만들 커밋 직전의 head를 잡아둔다.
      const headBefore = wiki && context.embeddingProvider ? wikiHead(wiki) : undefined
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
      const ingestId = recordIngestLog(
        context.database,
        wikiCommit ? { ...logInput, wikiCommit } : logInput,
      )
      // M4+.3 진행률 보드 — 수락된 ingest의 progress_updates를 feature별 최신 상태로 upsert.
      upsertFeatureProgress(context.database, {
        branch: parsed.data.branch,
        ingestId,
        updates: parsed.data.progress_updates,
      })
      // M4+.4 — ingest 커밋으로 변경된 페이지만 재인덱싱. 인덱싱 실패가 ingest를 깨면 안 된다.
      if (wiki && context.embeddingProvider && headBefore !== undefined) {
        try {
          await indexChangedWikiPages({
            database: context.database,
            wiki,
            branch: parsed.data.branch,
            provider: context.embeddingProvider,
            sinceCommit: headBefore,
          })
        } catch {
          // 임베딩 API 일시 장애 등 — 전체 재인덱스(관리 엔드포인트)로 복구 가능하므로 무시.
        }
      }
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

  // M4+.1 changes_since — since 커밋 이후 변경된 위키 페이지 목록(listWikiLastModified 래핑).
  server.get("/api/v1/wiki/:branch/changes", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = BranchParamsSchema.safeParse(request.params)
    const query = WikiChangesQuerySchema.safeParse(request.query)
    if (!params.success || !query.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, params.data.branch)
    if (!wiki || !wikiCommitExists(wiki, query.data.since)) {
      // 형식은 유효하나 위키 저장소에 없는 커밋 — 404로 구분한다(형식 오류는 위에서 422).
      return reply.status(404).send({ error: "commit_not_found" })
    }
    const changes = [...listWikiLastModified(wiki, query.data.since).entries()]
      .map(([path, touch]) => ({
        path,
        timestamp: touch.timestamp,
        author: touch.author,
        commit: touch.commitHash,
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
    return WikiChangesResponseSchema.parse({
      branch: params.data.branch,
      since: query.data.since,
      changes,
    })
  })

  // M4+.2 merge 배선 — :branch를 body.into로 병합. 충돌 시 기존 conflict+branch_lock 플로로 연결.
  server.post("/api/v1/wiki/:branch/merge", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = BranchParamsSchema.safeParse(request.params)
    const body = WikiMergeBodySchema.safeParse(request.body)
    if (
      !params.success ||
      !body.success ||
      !context.dataDir ||
      params.data.branch === body.data.into
    ) {
      return sendValidationFailed(reply)
    }
    // 병합 대상(into)이 이미 잠겨 있으면 기존 conflict 해소가 선행되어야 한다.
    if (!ensureUnlocked(context, body.data.into, reply)) {
      return reply
    }
    const result = mergeWikiBranch({
      database: context.database,
      dataDir: context.dataDir,
      targetBranch: body.data.into,
      sourceBranch: params.data.branch,
    })
    if (result.status === "merged") {
      return WikiMergeResponseSchema.parse({ status: "merged" })
    }
    return reply.status(409).send({ error: "merge_conflict", conflict_id: result.conflictId })
  })

  // M4+.3 진행률 보드 조회 — branch 미지정 시 전 브랜치 집계를 반환한다.
  server.get("/api/v1/progress", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const query = ProgressQuerySchema.safeParse(request.query)
    if (!query.success) {
      return sendValidationFailed(reply)
    }
    return ProgressBoardResponseSchema.parse({
      items: listFeatureProgress(context.database, query.data.branch),
    })
  })

  // M4+.4 시맨틱 검색 — embedding provider·인덱스가 있으면 코사인, 아니면 키워드 폴백.
  server.post("/api/v1/search", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = SearchRequestSchema.safeParse(request.body)
    if (!parsed.success || !isSafeBranchName(parsed.data.branch)) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, parsed.data.branch)
    if (!wiki) {
      return SearchResponseSchema.parse({
        branch: parsed.data.branch,
        mode: "keyword",
        results: [],
      })
    }
    return SearchResponseSchema.parse(
      await searchWiki({
        database: context.database,
        wiki,
        branch: parsed.data.branch,
        query: parsed.data.query,
        ...(parsed.data.top_k !== undefined ? { topK: parsed.data.top_k } : {}),
        provider: context.embeddingProvider,
      }),
    )
  })

  // M4+.4 전체 재인덱스(관리) — 임베딩 장애 복구·모델 교체 시 사용. lazy 기동 인덱싱 대신
  // 명시적 관리 엔드포인트를 택했다(기동 시간·무키 CI 결정성 보존).
  server.post("/api/v1/admin/search/reindex", async (request, reply) => {
    const member = await requireAdmin(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = ReindexBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
    const wiki = wikiFor(context, parsed.data.branch)
    if (!wiki || !context.embeddingProvider) {
      // provider 부재 시 인덱스가 무의미하므로 거부 — 검색은 키워드 폴백으로 계속 동작한다.
      return sendValidationFailed(reply)
    }
    const chunks = await reindexWikiBranch({
      database: context.database,
      wiki,
      branch: parsed.data.branch,
      provider: context.embeddingProvider,
    })
    return { status: "ok", chunks }
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
