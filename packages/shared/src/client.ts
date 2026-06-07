import { type ClientConfig, createRequester } from "./client-core.js"
import type { SpecraftClient } from "./client-types.js"
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
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
  OkResponseSchema,
  PaginationRequestSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  StatusResponseSchema,
  WikiGraphRequestSchema,
  WikiGraphResponseSchema,
  WikiHistoryRequestSchema,
  WikiHistoryResponseSchema,
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
  }
}
