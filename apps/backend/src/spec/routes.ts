import {
  ContextRequestSchema,
  ContextResponseSchema,
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
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
import { listIngestLogs, listQueryLogs, recordIngestLog, recordQueryLog } from "./logs.js"
import { answerWikiQuestionWithAgent, ingestWikiWithAgent } from "./wiki-agent.js"
import { buildWikiGraph } from "./wiki-graph.js"
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
    const response = {
      overview: wiki ? readWikiFile(wiki, "overview.md") : "",
      index: wiki ? readWikiFile(wiki, "index.md") : "",
      branch_status: { state: "ready" },
      wiki_head: wiki ? wikiHead(wiki) : "uninitialized",
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
    return QueryResponseSchema.parse(
      wiki
        ? await answerWikiQuestionWithAgent({
            provider: context.llmProvider,
            queryId,
            question: parsed.data.question,
            wiki,
          })
        : { answer: "", citations: [], query_id: queryId },
    )
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
        ? buildWikiGraph(wiki, parsed.data.branch)
        : { branch: parsed.data.branch, nodes: [], edges: [] },
    )
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
