import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { resolveLockedWikiMerge } from "../git/wiki-merge.js"
import { sendValidationFailed } from "../http/errors.js"
import { requireMember } from "./auth.js"
import { conflictHasSourceBranch, listConflicts, resolveConflict } from "./conflicts.js"
import type { SpecRouteContext } from "./routes.js"

const ConflictParamsSchema = z.object({ id: z.string().min(1) })
const ConflictResolveBodySchema = z.object({ directive: z.string().min(1) })

export function registerConflictRoutes(server: FastifyInstance, context: SpecRouteContext): void {
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
    if (context.dataDir && conflictHasSourceBranch(context.database, params.data.id)) {
      return resolveLockedWikiMerge(context.database, {
        dataDir: context.dataDir,
        directive: body.data.directive,
        id: params.data.id,
        memberId: member.id,
      })
    }
    return resolveConflict(context.database, {
      directive: body.data.directive,
      id: params.data.id,
      memberId: member.id,
    })
  })
}
