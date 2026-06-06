import { type ClientConfig, createRequester } from "./client-core.js"
import type {
  AdminInviteCreateResponse,
  AdminMemberDisableRequest,
  AdminMemberDisableResponse,
  AdminSettingsRequest,
  AdminSettingsResponse,
  ApiKeyCreatedResponse,
  ApiKeyCreateRequest,
  ApiKeyDeleteRequest,
  ApiKeyDeleteResponse,
  ApiKeyListResponse,
  AuthLoginRequest,
  AuthSessionResponse,
  AuthSignupRequest,
  ConflictListResponse,
  ConflictResolveRequest,
  ConflictResolveResponse,
  ContextRequest,
  ContextResponse,
  IngestLogListResponse,
  IngestPayload,
  IngestResponse,
  PaginationRequest,
  QueryLogListResponse,
  QueryRequest,
  QueryResponse,
  StatusResponse,
  WikiPageRequest,
  WikiPageResponse,
  WikiTreeRequest,
  WikiTreeResponse,
} from "./schemas.js"
import {
  AdminInviteCreateResponseSchema,
  AdminMemberDisableRequestSchema,
  AdminMemberDisableResponseSchema,
  AdminSettingsRequestSchema,
  AdminSettingsResponseSchema,
  ApiKeyCreatedResponseSchema,
  ApiKeyCreateRequestSchema,
  ApiKeyDeleteRequestSchema,
  ApiKeyDeleteResponseSchema,
  ApiKeyListResponseSchema,
  AuthLoginRequestSchema,
  AuthSessionResponseSchema,
  AuthSignupRequestSchema,
  ConflictListResponseSchema,
  ConflictResolveRequestSchema,
  ConflictResolveResponseSchema,
  ContextRequestSchema,
  ContextResponseSchema,
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
  PaginationRequestSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  StatusResponseSchema,
  WikiPageRequestSchema,
  WikiPageResponseSchema,
  WikiTreeRequestSchema,
  WikiTreeResponseSchema,
} from "./schemas.js"

export type { ClientConfig } from "./client-core.js"
export { SpecraftHttpError } from "./client-core.js"

export type SpecraftClient = {
  readonly context: (request: ContextRequest) => Promise<ContextResponse>
  readonly query: (request: QueryRequest) => Promise<QueryResponse>
  readonly ingest: (request: IngestPayload) => Promise<IngestResponse>
  readonly status: () => Promise<StatusResponse>
  readonly authSignup: (request: AuthSignupRequest) => Promise<AuthSessionResponse>
  readonly authLogin: (request: AuthLoginRequest) => Promise<AuthSessionResponse>
  readonly createApiKey: (request: ApiKeyCreateRequest) => Promise<ApiKeyCreatedResponse>
  readonly listApiKeys: () => Promise<ApiKeyListResponse>
  readonly deleteApiKey: (request: ApiKeyDeleteRequest) => Promise<ApiKeyDeleteResponse>
  readonly createAdminInvite: () => Promise<AdminInviteCreateResponse>
  readonly updateAdminSettings: (request: AdminSettingsRequest) => Promise<AdminSettingsResponse>
  readonly disableAdminMember: (
    request: AdminMemberDisableRequest,
  ) => Promise<AdminMemberDisableResponse>
  readonly listConflicts: () => Promise<ConflictListResponse>
  readonly resolveConflict: (request: ConflictResolveRequest) => Promise<ConflictResolveResponse>
  readonly listIngestLogs: (request?: PaginationRequest) => Promise<IngestLogListResponse>
  readonly listQueryLogs: (request?: PaginationRequest) => Promise<QueryLogListResponse>
  readonly wikiTree: (request: WikiTreeRequest) => Promise<WikiTreeResponse>
  readonly wikiPage: (request: WikiPageRequest) => Promise<WikiPageResponse>
}

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
    updateAdminSettings: (body) =>
      request({
        path: "/api/v1/admin/settings",
        method: "PUT",
        requestSchema: AdminSettingsRequestSchema,
        responseSchema: AdminSettingsResponseSchema,
        body,
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
  }
}
