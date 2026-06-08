import type {
  AdminGitTestConnectionResponse,
  AdminInviteCreateResponse,
  AdminInviteListResponse,
  AdminMemberDisableRequest,
  AdminMemberDisableResponse,
  AdminMemberEnableRequest,
  AdminMemberEnableResponse,
  AdminMemberListResponse,
  AdminSettingsRequest,
  AdminSettingsResponse,
  AdminSettingsViewResponse,
  ApiKeyCreatedResponse,
  ApiKeyCreateRequest,
  ApiKeyDeleteRequest,
  ApiKeyDeleteResponse,
  ApiKeyListResponse,
  AuthLoginRequest,
  AuthSessionResponse,
  AuthSignupRequest,
  BootstrapAdminRequest,
  ConflictListResponse,
  ConflictResolveRequest,
  ConflictResolveResponse,
  ContextRequest,
  ContextResponse,
  IngestLogListResponse,
  IngestPayload,
  IngestResponse,
  OkResponse,
  PaginationRequest,
  QueryLogListResponse,
  QueryRequest,
  QueryResponse,
  StatusResponse,
  WikiGraphRequest,
  WikiGraphResponse,
  WikiHistoryRequest,
  WikiHistoryResponse,
  WikiPageRequest,
  WikiPageResponse,
  WikiTreeRequest,
  WikiTreeResponse,
} from "./schemas.js"

export type QueryToolCall = {
  readonly name: string
  readonly arguments: string
}

export type QueryToolResult = {
  readonly name: string
  readonly result: string
}

/** queryStream 진행 콜백: 토큰(onDelta)과 도구 호출/결과(onToolCall/onToolResult)를 통지한다. */
export type QueryStreamHandlers = {
  readonly onDelta: (text: string) => void
  readonly onToolCall?: (call: QueryToolCall) => void
  readonly onToolResult?: (result: QueryToolResult) => void
}

export type SpecraftClient = {
  readonly context: (request: ContextRequest) => Promise<ContextResponse>
  readonly query: (request: QueryRequest) => Promise<QueryResponse>
  readonly queryStream: (
    request: QueryRequest,
    handlers: QueryStreamHandlers,
    signal?: AbortSignal,
  ) => Promise<QueryResponse>
  readonly ingest: (request: IngestPayload) => Promise<IngestResponse>
  readonly status: () => Promise<StatusResponse>
  readonly authSession: () => Promise<AuthSessionResponse>
  readonly bootstrapAdmin: (request: BootstrapAdminRequest) => Promise<AuthSessionResponse>
  readonly authSignup: (request: AuthSignupRequest) => Promise<AuthSessionResponse>
  readonly authLogin: (request: AuthLoginRequest) => Promise<AuthSessionResponse>
  readonly authLogout: () => Promise<OkResponse>
  readonly createApiKey: (request: ApiKeyCreateRequest) => Promise<ApiKeyCreatedResponse>
  readonly listApiKeys: () => Promise<ApiKeyListResponse>
  readonly deleteApiKey: (request: ApiKeyDeleteRequest) => Promise<ApiKeyDeleteResponse>
  readonly createAdminInvite: () => Promise<AdminInviteCreateResponse>
  readonly listAdminInvites: () => Promise<AdminInviteListResponse>
  readonly getAdminSettings: () => Promise<AdminSettingsViewResponse>
  readonly updateAdminSettings: (request: AdminSettingsRequest) => Promise<AdminSettingsResponse>
  readonly listAdminMembers: () => Promise<AdminMemberListResponse>
  readonly disableAdminMember: (
    request: AdminMemberDisableRequest,
  ) => Promise<AdminMemberDisableResponse>
  readonly enableAdminMember: (
    request: AdminMemberEnableRequest,
  ) => Promise<AdminMemberEnableResponse>
  readonly testGitConnection: () => Promise<AdminGitTestConnectionResponse>
  readonly listConflicts: () => Promise<ConflictListResponse>
  readonly resolveConflict: (request: ConflictResolveRequest) => Promise<ConflictResolveResponse>
  readonly listIngestLogs: (request?: PaginationRequest) => Promise<IngestLogListResponse>
  readonly listQueryLogs: (request?: PaginationRequest) => Promise<QueryLogListResponse>
  readonly wikiTree: (request: WikiTreeRequest) => Promise<WikiTreeResponse>
  readonly wikiPage: (request: WikiPageRequest) => Promise<WikiPageResponse>
  readonly wikiGraph: (request: WikiGraphRequest) => Promise<WikiGraphResponse>
  readonly wikiHistory: (request: WikiHistoryRequest) => Promise<WikiHistoryResponse>
}
