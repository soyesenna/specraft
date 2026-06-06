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
  WikiPageResponseSchema,
  WikiTreeResponseSchema,
} from "@specraft/shared"
import type { FastifyInstance, FastifyReply } from "fastify"
import { z } from "zod"
import { getSetting } from "../auth/store.js"
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
import { resolveLockedWikiMerge } from "../git/wiki-merge.js"
import { sendValidationFailed } from "../http/errors.js"
import type { SpecraftDatabase } from "../storage/database.js"
import { requireMember } from "./auth.js"
import { listConflicts, resolveConflict } from "./conflicts.js"
import { listIngestLogs, listQueryLogs, recordIngestLog, recordQueryLog } from "./logs.js"
import { answerWikiQuestion, appendIngestToWiki } from "./wiki-agent.js"

export type SpecRouteContext = {
  readonly database: SpecraftDatabase
  readonly dataDir?: string
  readonly codeRemoteUrl?: string
}

const BranchParamsSchema = z.object({ branch: z.string().min(1) })
const ConflictParamsSchema = z.object({ id: z.string().min(1) })
const ConflictResolveBodySchema = z.object({ directive: z.string().min(1) })
const WikiPageQuerySchema = z.object({ path: z.string().min(1) })

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
  server.post("/api/v1/context", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = ContextRequestSchema.safeParse(request.body)
    if (!parsed.success) {
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
    if (!parsed.success) {
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
        ? answerWikiQuestion(wiki, parsed.data.question, queryId)
        : { answer: "", citations: [], query_id: queryId },
    )
  })

  server.post("/api/v1/ingest", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const parsed = IngestPayloadSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendValidationFailed(reply)
    }
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
    const wikiCommit = wiki ? appendIngestToWiki(wiki, member, parsed.data) : undefined
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

  server.get("/api/v1/conflicts", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    return { conflicts: listConflicts(context.database) }
  })

  server.post("/api/v1/conflicts/:id/resolve", async (request, reply) => {
    const member = await requireMember(request, reply, context.database)
    if ("statusCode" in member) {
      return member
    }
    const params = ConflictParamsSchema.safeParse(request.params)
    const body = ConflictResolveBodySchema.safeParse(request.body)
    if (!params.success || !body.success) {
      return sendValidationFailed(reply)
    }
    if (context.dataDir) {
      const resolved = resolveLockedWikiMerge(context.database, {
        dataDir: context.dataDir,
        directive: body.data.directive,
        id: params.data.id,
        memberId: member.id,
      })
      if (resolved.status === "resolved") {
        return resolved
      }
    }
    return resolveConflict(context.database, {
      directive: body.data.directive,
      id: params.data.id,
      memberId: member.id,
    })
  })

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
