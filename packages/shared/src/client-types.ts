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
  GraphLayoutRequest,
  GraphLayoutResponse,
  GraphLayoutSaveRequest,
  GraphLayoutSaveResponse,
  IngestLogDetail,
  IngestLogListResponse,
  IngestPayload,
  IngestResponse,
  OkResponse,
  PaginationRequest,
  ProgressBoardRequest,
  ProgressBoardResponse,
  QueryLogDetail,
  QueryLogListResponse,
  QueryRequest,
  QueryResponse,
  SearchRequest,
  SearchResponse,
  StatusResponse,
  WikiChangesRequest,
  WikiChangesResponse,
  WikiGraphRequest,
  WikiGraphResponse,
  WikiHistoryRequest,
  WikiHistoryResponse,
  WikiMergeRequest,
  WikiMergeResponse,
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
  readonly getIngestLog: (id: string) => Promise<IngestLogDetail>
  readonly getQueryLog: (id: string) => Promise<QueryLogDetail>
  readonly wikiTree: (request: WikiTreeRequest) => Promise<WikiTreeResponse>
  readonly wikiPage: (request: WikiPageRequest) => Promise<WikiPageResponse>
  readonly wikiGraph: (request: WikiGraphRequest) => Promise<WikiGraphResponse>
  readonly wikiHistory: (request: WikiHistoryRequest) => Promise<WikiHistoryResponse>
  readonly getGraphLayout: (request: GraphLayoutRequest) => Promise<GraphLayoutResponse>
  readonly saveGraphLayout: (request: GraphLayoutSaveRequest) => Promise<GraphLayoutSaveResponse>
  /** M4+.1 — since 커밋 이후 변경된 위키 페이지 목록 */
  readonly wikiChanges: (request: WikiChangesRequest) => Promise<WikiChangesResponse>
  /** M4+.2 — branch를 into로 병합. 충돌 시 {status:"conflict", conflict_id}로 매핑된다 */
  readonly wikiMerge: (request: WikiMergeRequest) => Promise<WikiMergeResponse>
  /** M4+.3 — feature별 최신 진행률 보드 (branch 미지정 시 전체) */
  readonly progressBoard: (request?: ProgressBoardRequest) => Promise<ProgressBoardResponse>
  /** M4+.4 — 시맨틱 검색 (provider 부재 시 키워드 폴백) */
  readonly search: (request: SearchRequest) => Promise<SearchResponse>
}
