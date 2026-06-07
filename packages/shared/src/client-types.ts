import type {
  AdminInviteCreateResponse,
  AdminInviteListResponse,
  AdminMemberDisableRequest,
  AdminMemberDisableResponse,
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
  WikiPageRequest,
  WikiPageResponse,
  WikiTreeRequest,
  WikiTreeResponse,
} from "./schemas.js"

export type SpecraftClient = {
  readonly context: (request: ContextRequest) => Promise<ContextResponse>
  readonly query: (request: QueryRequest) => Promise<QueryResponse>
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
  readonly listConflicts: () => Promise<ConflictListResponse>
  readonly resolveConflict: (request: ConflictResolveRequest) => Promise<ConflictResolveResponse>
  readonly listIngestLogs: (request?: PaginationRequest) => Promise<IngestLogListResponse>
  readonly listQueryLogs: (request?: PaginationRequest) => Promise<QueryLogListResponse>
  readonly wikiTree: (request: WikiTreeRequest) => Promise<WikiTreeResponse>
  readonly wikiPage: (request: WikiPageRequest) => Promise<WikiPageResponse>
}
