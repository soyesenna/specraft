import { type ClientConfig, createRequester, SpecraftHttpError } from "./client-core.js"
import type { QueryStreamHandlers, SpecraftClient } from "./client-types.js"
import type { QueryRequest, QueryResponse } from "./schemas.js"
import {
  AdminGitTestConnectionResponseSchema,
  AdminInviteCreateResponseSchema,
  AdminInviteListResponseSchema,
  AdminMemberDisableRequestSchema,
  AdminMemberDisableResponseSchema,
  AdminMemberEnableRequestSchema,
  AdminMemberEnableResponseSchema,
  AdminMemberListResponseSchema,
  AdminSettingsRequestSchema,
  AdminSettingsResponseSchema,
  AdminSettingsViewResponseSchema,
  ApiKeyCreatedResponseSchema,
  ApiKeyCreateRequestSchema,
  ApiKeyDeleteRequestSchema,
  ApiKeyDeleteResponseSchema,
  ApiKeyListResponseSchema,
  AuthLoginRequestSchema,
  AuthSessionResponseSchema,
  AuthSignupRequestSchema,
  BootstrapAdminRequestSchema,
  ConflictListResponseSchema,
  ConflictResolveRequestSchema,
  ConflictResolveResponseSchema,
  ContextRequestSchema,
  ContextResponseSchema,
  GraphLayoutRequestSchema,
  GraphLayoutResponseSchema,
  GraphLayoutSaveRequestSchema,
  GraphLayoutSaveResponseSchema,
  IngestLogDetailSchema,
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
  MergeConflictErrorSchema,
  OkResponseSchema,
  PaginationRequestSchema,
  ProgressBoardRequestSchema,
  ProgressBoardResponseSchema,
  QueryLogDetailSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  StatusResponseSchema,
  WikiChangesRequestSchema,
  WikiChangesResponseSchema,
  WikiGraphRequestSchema,
  WikiGraphResponseSchema,
  WikiHistoryRequestSchema,
  WikiHistoryResponseSchema,
  WikiMergeRequestSchema,
  WikiMergeResponseSchema,
  WikiPageRequestSchema,
  WikiPageResponseSchema,
  WikiTreeRequestSchema,
  WikiTreeResponseSchema,
} from "./schemas.js"

export type { ClientConfig } from "./client-core.js"
export { SpecraftHttpError } from "./client-core.js"
export type { SpecraftClient } from "./client-types.js"

export function createSpecraftClient(config: ClientConfig): SpecraftClient {
  const request = createRequester(config)

  return {
    context: (body) =>
      request({
        path: "/api/v1/context",
        method: "POST",
        requestSchema: ContextRequestSchema,
        responseSchema: ContextResponseSchema,
        body,
      }),
    query: (body) =>
      request({
        path: "/api/v1/query",
        method: "POST",
        requestSchema: QueryRequestSchema,
        responseSchema: QueryResponseSchema,
        body,
      }),
    queryStream: (body, handlers, signal) =>
      streamQuery(config, QueryRequestSchema.parse(body), handlers, signal),
    ingest: (body) =>
      request({
        path: "/api/v1/ingest",
        method: "POST",
        requestSchema: IngestPayloadSchema,
        responseSchema: IngestResponseSchema,
        body,
      }),
    status: () =>
      request({
        path: "/api/v1/status",
        method: "GET",
        responseSchema: StatusResponseSchema,
      }),
    authSession: () =>
      request({
        path: "/api/v1/auth/session",
        method: "GET",
        responseSchema: AuthSessionResponseSchema,
      }),
    bootstrapAdmin: (body) =>
      request({
        path: "/api/v1/auth/bootstrap-admin",
        method: "POST",
        requestSchema: BootstrapAdminRequestSchema,
        responseSchema: AuthSessionResponseSchema,
        body,
      }),
    authSignup: (body) =>
      request({
        path: "/api/v1/auth/signup",
        method: "POST",
        requestSchema: AuthSignupRequestSchema,
        responseSchema: AuthSessionResponseSchema,
        body,
      }),
    authLogin: (body) =>
      request({
        path: "/api/v1/auth/login",
        method: "POST",
        requestSchema: AuthLoginRequestSchema,
        responseSchema: AuthSessionResponseSchema,
        body,
      }),
    authLogout: () =>
      request({
        path: "/api/v1/auth/logout",
        method: "POST",
        responseSchema: OkResponseSchema,
      }),
    createApiKey: (body) =>
      request({
        path: "/api/v1/keys",
        method: "POST",
        requestSchema: ApiKeyCreateRequestSchema,
        responseSchema: ApiKeyCreatedResponseSchema,
        body,
      }),
    listApiKeys: () =>
      request({
        path: "/api/v1/keys",
        method: "GET",
        responseSchema: ApiKeyListResponseSchema,
      }),
    deleteApiKey: (body) =>
      request({
        path: "/api/v1/keys",
        method: "DELETE",
        requestSchema: ApiKeyDeleteRequestSchema,
        responseSchema: ApiKeyDeleteResponseSchema,
        body,
      }),
    createAdminInvite: () =>
      request({
        path: "/api/v1/admin/invites",
        method: "POST",
        responseSchema: AdminInviteCreateResponseSchema,
      }),
    listAdminInvites: () =>
      request({
        path: "/api/v1/admin/invites",
        method: "GET",
        responseSchema: AdminInviteListResponseSchema,
      }),
    getAdminSettings: () =>
      request({
        path: "/api/v1/admin/settings",
        method: "GET",
        responseSchema: AdminSettingsViewResponseSchema,
      }),
    updateAdminSettings: (body) =>
      request({
        path: "/api/v1/admin/settings",
        method: "PUT",
        requestSchema: AdminSettingsRequestSchema,
        responseSchema: AdminSettingsResponseSchema,
        body,
      }),
    listAdminMembers: () =>
      request({
        path: "/api/v1/admin/members",
        method: "GET",
        responseSchema: AdminMemberListResponseSchema,
      }),
    disableAdminMember: (body) => {
      const parsed = AdminMemberDisableRequestSchema.parse(body)
      return request({
        path: `/api/v1/admin/members/${encodeURIComponent(parsed.id)}/disable`,
        method: "PUT",
        responseSchema: AdminMemberDisableResponseSchema,
      })
    },
    listConflicts: () =>
      request({
        path: "/api/v1/conflicts",
        method: "GET",
        responseSchema: ConflictListResponseSchema,
      }),
    resolveConflict: (body) => {
      const parsed = ConflictResolveRequestSchema.parse(body)
      return request({
        path: `/api/v1/conflicts/${encodeURIComponent(parsed.id)}/resolve`,
        method: "POST",
        responseSchema: ConflictResolveResponseSchema,
        body: { directive: parsed.directive },
      })
    },
    listIngestLogs: (body = {}) => {
      const parsed = PaginationRequestSchema.parse(body)
      return request({
        path: "/api/v1/logs/ingests",
        method: "GET",
        responseSchema: IngestLogListResponseSchema,
        query: [
          ["cursor", parsed.cursor],
          ["limit", parsed.limit],
        ],
      })
    },
    listQueryLogs: (body = {}) => {
      const parsed = PaginationRequestSchema.parse(body)
      return request({
        path: "/api/v1/logs/queries",
        method: "GET",
        responseSchema: QueryLogListResponseSchema,
        query: [
          ["cursor", parsed.cursor],
          ["limit", parsed.limit],
        ],
      })
    },
    getIngestLog: (id) =>
      request({
        path: `/api/v1/logs/ingests/${encodeURIComponent(id)}`,
        method: "GET",
        responseSchema: IngestLogDetailSchema,
      }),
    getQueryLog: (id) =>
      request({
        path: `/api/v1/logs/queries/${encodeURIComponent(id)}`,
        method: "GET",
        responseSchema: QueryLogDetailSchema,
      }),
    wikiTree: (body) => {
      const parsed = WikiTreeRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/tree`,
        method: "GET",
        responseSchema: WikiTreeResponseSchema,
      })
    },
    wikiPage: (body) => {
      const parsed = WikiPageRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/page`,
        method: "GET",
        responseSchema: WikiPageResponseSchema,
        query: [["path", parsed.path]],
      })
    },
    wikiGraph: (body) => {
      const parsed = WikiGraphRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/graph`,
        method: "GET",
        responseSchema: WikiGraphResponseSchema,
      })
    },
    wikiHistory: (body) => {
      const parsed = WikiHistoryRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/history`,
        method: "GET",
        responseSchema: WikiHistoryResponseSchema,
        query: [["path", parsed.path]],
      })
    },
    getGraphLayout: (body) => {
      const parsed = GraphLayoutRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/layout`,
        method: "GET",
        responseSchema: GraphLayoutResponseSchema,
      })
    },
    saveGraphLayout: (body) => {
      const parsed = GraphLayoutSaveRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/layout`,
        method: "PUT",
        requestSchema: GraphLayoutSaveRequestSchema,
        responseSchema: GraphLayoutSaveResponseSchema,
        body: parsed,
      })
    },
    testGitConnection: () =>
      request({
        path: "/api/v1/admin/git/test-connection",
        method: "POST",
        responseSchema: AdminGitTestConnectionResponseSchema,
      }),
    enableAdminMember: (body) => {
      const parsed = AdminMemberEnableRequestSchema.parse(body)
      return request({
        path: "/api/v1/admin/members/enable",
        method: "POST",
        responseSchema: AdminMemberEnableResponseSchema,
        body: { id: parsed.id },
      })
    },
    wikiChanges: (body) => {
      const parsed = WikiChangesRequestSchema.parse(body)
      return request({
        path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/changes`,
        method: "GET",
        responseSchema: WikiChangesResponseSchema,
        query: [["since", parsed.since]],
      })
    },
    wikiMerge: async (body) => {
      const parsed = WikiMergeRequestSchema.parse(body)
      try {
        return await request({
          path: `/api/v1/wiki/${encodeURIComponent(parsed.branch)}/merge`,
          method: "POST",
          responseSchema: WikiMergeResponseSchema,
          body: { into: parsed.into },
        })
      } catch (error) {
        // 409 merge_conflict는 정상 흐름의 한 갈래(conflict_id 회수)이므로 응답 변형으로 매핑한다.
        if (error instanceof SpecraftHttpError && error.status === 409) {
          const conflict = MergeConflictErrorSchema.safeParse(error.body)
          if (conflict.success) {
            return { status: "conflict", conflict_id: conflict.data.conflict_id }
          }
        }
        throw error
      }
    },
    progressBoard: (body = {}) => {
      const parsed = ProgressBoardRequestSchema.parse(body)
      return request({
        path: "/api/v1/progress",
        method: "GET",
        responseSchema: ProgressBoardResponseSchema,
        query: [["branch", parsed.branch]],
      })
    },
    search: (body) =>
      request({
        path: "/api/v1/search",
        method: "POST",
        requestSchema: SearchRequestSchema,
        responseSchema: SearchResponseSchema,
        body,
      }),
  }
}

async function streamQuery(
  config: ClientConfig,
  body: QueryRequest,
  handlers: QueryStreamHandlers,
  signal: AbortSignal | undefined,
): Promise<QueryResponse> {
  const url = new URL("/api/v1/query/stream", config.baseUrl)
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (config.apiKey) {
    headers["authorization"] = `Bearer ${config.apiKey}`
  }
  const fetcher = config.fetch ?? globalThis.fetch
  const response = await fetcher(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  })
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "")
    let parsed: unknown = text
    try {
      parsed = text.length > 0 ? JSON.parse(text) : {}
    } catch {
      parsed = text
    }
    throw new SpecraftHttpError(response.status, parsed)
  }
  return readSseStream(response.body, handlers)
}

async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  handlers: QueryStreamHandlers,
): Promise<QueryResponse> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let result: QueryResponse | null = null
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      let separator = buffer.indexOf("\n\n")
      while (separator !== -1) {
        const handled = handleSseEvent(buffer.slice(0, separator), handlers)
        buffer = buffer.slice(separator + 2)
        if (handled) {
          result = handled
        }
        separator = buffer.indexOf("\n\n")
      }
    }
  } finally {
    reader.releaseLock()
  }
  if (!result) {
    throw new Error("query stream ended without a result")
  }
  return result
}

function handleSseEvent(raw: string, handlers: QueryStreamHandlers): QueryResponse | null {
  let event = "message"
  const dataLines: string[] = []
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim()
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim())
    }
  }
  if (dataLines.length === 0) {
    return null
  }
  let data: unknown
  try {
    data = JSON.parse(dataLines.join("\n"))
  } catch {
    return null
  }
  if (event === "delta") {
    handlers.onDelta(stringField(data, "text"))
    return null
  }
  if (event === "tool_call") {
    handlers.onToolCall?.({
      name: stringField(data, "name"),
      arguments: stringField(data, "arguments"),
    })
    return null
  }
  if (event === "tool_result") {
    handlers.onToolResult?.({
      name: stringField(data, "name"),
      result: stringField(data, "result"),
    })
    return null
  }
  if (event === "error") {
    throw new Error(stringField(data, "message") || "query stream failed")
  }
  if (event === "done") {
    return QueryResponseSchema.parse(data)
  }
  return null
}

function stringField(data: unknown, key: string): string {
  if (data && typeof data === "object" && key in data) {
    const value = (data as Record<string, unknown>)[key]
    if (typeof value === "string") {
      return value
    }
  }
  return ""
}
