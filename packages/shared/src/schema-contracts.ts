import { z } from "zod"
import {
  AgentSchema,
  BranchLockSchema,
  BranchStatusSchema,
  CitationSchema,
  ConflictStateSchema,
  EmailSchema,
  GitBranchNameSchema,
  IngestRejectionReasonSchema,
  IngestStatusSchema,
  LogActorSchema,
  MemberSchema,
  NonEmptyStringSchema,
  OkResponseSchema,
  ProgressUpdateSchema,
  SpecChangeSchema,
} from "./schema-foundation.js"

export const PaginationRequestSchema = z.object({
  cursor: NonEmptyStringSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export const IngestPayloadSchema = z.object({
  branch: GitBranchNameSchema,
  commit_hash: NonEmptyStringSchema,
  agent: AgentSchema,
  session_id: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  spec_changes: z.array(SpecChangeSchema).min(1),
  progress_updates: z.array(ProgressUpdateSchema),
  open_questions: z.array(z.string()),
})

export const ContextRequestSchema = z.object({
  branch: GitBranchNameSchema,
  commit_hash: NonEmptyStringSchema,
})

export const ContextResponseSchema = z.object({
  overview: z.string(),
  index: z.string(),
  branch_status: BranchStatusSchema,
  wiki_head: NonEmptyStringSchema,
})

export const QueryRequestSchema = ContextRequestSchema.extend({
  question: NonEmptyStringSchema,
})

export const QueryResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  query_id: NonEmptyStringSchema,
})

export const IngestAcceptedResponseSchema = z.object({
  status: z.literal("accepted"),
  wiki_commit: NonEmptyStringSchema.optional(),
})

export const IngestRejectedResponseSchema = z.object({
  status: z.literal("rejected"),
  reason: IngestRejectionReasonSchema,
})

export const IngestResponseSchema = z.discriminatedUnion("status", [
  IngestAcceptedResponseSchema,
  IngestRejectedResponseSchema,
])

export const StatusResponseSchema = z.object({
  server: z.literal("ok"),
  branch_locks: z.array(BranchLockSchema),
  wiki_head_by_branch: z.record(GitBranchNameSchema, NonEmptyStringSchema),
})

export const AuthSignupRequestSchema = z.object({
  invite_token: NonEmptyStringSchema,
  email: EmailSchema,
  password: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
})

export const AuthLoginRequestSchema = z.object({
  email: EmailSchema,
  password: NonEmptyStringSchema,
})

export const BootstrapAdminRequestSchema = z.object({
  email: EmailSchema,
  password: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
})

export const AuthSessionResponseSchema = z.object({
  member: MemberSchema,
})

export const ApiKeyCreateRequestSchema = z.object({
  name: NonEmptyStringSchema,
})

export const ApiKeyCreatedResponseSchema = z.object({
  id: NonEmptyStringSchema,
  api_key: z.string().startsWith("sk-spcrft-"),
})

export const ApiKeySchema = z.object({
  id: NonEmptyStringSchema,
  prefix: z.string().startsWith("sk-spcrft-"),
  name: NonEmptyStringSchema,
  created_at: NonEmptyStringSchema,
  revoked_at: NonEmptyStringSchema.nullable(),
})

export const ApiKeyListResponseSchema = z.object({
  keys: z.array(ApiKeySchema),
})

export const ApiKeyDeleteRequestSchema = z.object({
  id: NonEmptyStringSchema,
})

export const ApiKeyDeleteResponseSchema = OkResponseSchema

export const AdminInviteCreateResponseSchema = z.object({
  invite_url: NonEmptyStringSchema,
  expires_at: NonEmptyStringSchema,
})

export const AdminInviteSchema = z.object({
  token: NonEmptyStringSchema,
  /** 생성 시각 — created_at 컬럼 도입 이전 레거시 행은 null */
  created_at: NonEmptyStringSchema.nullable(),
  created_by: MemberSchema.nullable(),
  expires_at: NonEmptyStringSchema,
  used_at: NonEmptyStringSchema.nullable(),
  used_by: MemberSchema.nullable(),
})

export const AdminInviteListResponseSchema = z.object({
  invites: z.array(AdminInviteSchema),
})

export const AdminSettingsRequestSchema = z.object({
  git_remote_url: NonEmptyStringSchema.optional(),
  git_credential: NonEmptyStringSchema.optional(),
  model_ingest: NonEmptyStringSchema.optional(),
  model_query: NonEmptyStringSchema.optional(),
})

export const AdminSettingsResponseSchema = OkResponseSchema

export const AdminSettingsViewResponseSchema = z.object({
  git_remote_url: NonEmptyStringSchema.nullable(),
  model_ingest: NonEmptyStringSchema.nullable(),
  model_query: NonEmptyStringSchema.nullable(),
  credential_configured: z.boolean(),
})

export const AdminMemberDisableRequestSchema = z.object({
  id: NonEmptyStringSchema,
})

export const AdminMemberDisableResponseSchema = OkResponseSchema

export const AdminMemberListResponseSchema = z.object({
  members: z.array(MemberSchema),
})

export const ConflictSchema = z.object({
  id: NonEmptyStringSchema,
  branch: NonEmptyStringSchema,
  source_branch: NonEmptyStringSchema.optional(),
  state: ConflictStateSchema,
  detail: NonEmptyStringSchema,
})

export const ConflictListResponseSchema = z.object({
  conflicts: z.array(ConflictSchema),
})

export const ConflictResolveRequestSchema = z.object({
  id: NonEmptyStringSchema,
  directive: NonEmptyStringSchema,
})

export const ConflictResolveResponseSchema = z.object({
  status: z.enum(["resolved", "still_locked"]),
  conflict: ConflictSchema.optional(),
})

export const IngestLogSchema = z.object({
  id: NonEmptyStringSchema,
  member: LogActorSchema,
  branch: NonEmptyStringSchema,
  commit_hash: NonEmptyStringSchema,
  status: IngestStatusSchema,
  summary: z.string(),
  wiki_commit: NonEmptyStringSchema.optional(),
  created_at: NonEmptyStringSchema,
})

export const QueryLogSchema = z.object({
  id: NonEmptyStringSchema,
  member: LogActorSchema,
  branch: NonEmptyStringSchema,
  question: NonEmptyStringSchema,
  created_at: NonEmptyStringSchema,
})

export const ToolCallSchema = z.object({
  name: NonEmptyStringSchema,
  arguments: z.string(),
  result: z.string().nullable(),
})

export const IngestLogDetailSchema = IngestLogSchema.extend({
  spec_changes: z.array(SpecChangeSchema),
  progress_updates: z.array(ProgressUpdateSchema),
  open_questions: z.array(z.string()),
})

export const QueryLogDetailSchema = QueryLogSchema.extend({
  answer: z.string().nullable(),
  citations: z.array(CitationSchema),
  tool_calls: z.array(ToolCallSchema),
})

export const IngestLogListResponseSchema = z.object({
  logs: z.array(IngestLogSchema),
  next_cursor: NonEmptyStringSchema.nullable(),
})

export const QueryLogListResponseSchema = z.object({
  logs: z.array(QueryLogSchema),
  next_cursor: NonEmptyStringSchema.nullable(),
})

export const WikiTreeRequestSchema = z.object({
  branch: NonEmptyStringSchema,
})

export const WikiTreeResponseSchema = z.object({
  branch: NonEmptyStringSchema,
  entries: z.array(z.object({ path: NonEmptyStringSchema, type: z.enum(["file", "dir"]) })),
})

export const WikiPageRequestSchema = z.object({
  branch: NonEmptyStringSchema,
  path: NonEmptyStringSchema,
})

export const WikiPageResponseSchema = z.object({
  branch: NonEmptyStringSchema,
  path: NonEmptyStringSchema,
  content: z.string(),
})

export const WikiGraphRequestSchema = z.object({
  branch: NonEmptyStringSchema,
})

export const WikiGraphNodeSchema = z.object({
  path: NonEmptyStringSchema,
  title: z.string(),
  dir: NonEmptyStringSchema,
  summary: z.string(),
  /** 마지막 수정 커밋 시각(ISO) — 04 리스트 뷰 UPDATED 컬럼용 */
  updated: z.string().optional(),
  /** 마지막 수정 커밋 author — 행 아바타 이니셜용 */
  author: z.string().optional(),
  /** 마지막 수정 커밋 short hash — 03 디테일 패널 메타 칩용 */
  commit: z.string().optional(),
})

export const WikiGraphEdgeSchema = z.object({
  from: NonEmptyStringSchema,
  to: NonEmptyStringSchema,
})

export const WikiGraphResponseSchema = z.object({
  branch: NonEmptyStringSchema,
  nodes: z.array(WikiGraphNodeSchema),
  edges: z.array(WikiGraphEdgeSchema),
})

/** 그래프 노드 위치 — 레이아웃 콘텐츠 좌표계의 노드 좌상단(x,y) */
export const GraphLayoutPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const GraphLayoutRequestSchema = z.object({
  branch: NonEmptyStringSchema,
})

/** 사용자별 그래프 노드 배치 — path → 위치 오버라이드 (없는 노드는 기본 레이아웃) */
export const GraphLayoutResponseSchema = z.object({
  branch: NonEmptyStringSchema,
  positions: z.record(z.string(), GraphLayoutPositionSchema),
})

export const GraphLayoutSaveRequestSchema = z.object({
  branch: NonEmptyStringSchema,
  positions: z.record(z.string(), GraphLayoutPositionSchema),
})

export const GraphLayoutSaveResponseSchema = OkResponseSchema

export const WikiHistoryRequestSchema = z.object({
  branch: NonEmptyStringSchema,
  path: NonEmptyStringSchema,
})

export const WikiVersionSchema = z.object({
  commit_hash: NonEmptyStringSchema,
  summary: z.string(),
  author: z.string(),
  timestamp: NonEmptyStringSchema,
  added_lines: z.number().int().min(0),
  removed_lines: z.number().int().min(0),
  added: z.array(z.string()),
  removed: z.array(z.string()),
})

export const WikiHistoryResponseSchema = z.object({
  branch: NonEmptyStringSchema,
  path: NonEmptyStringSchema,
  versions: z.array(WikiVersionSchema),
})

export const AdminGitTestConnectionResponseSchema = z.object({
  status: z.enum(["ok", "failed"]),
  message: z.string().optional(),
})

export const AdminMemberEnableRequestSchema = z.object({
  id: NonEmptyStringSchema,
})

export const AdminMemberEnableResponseSchema = OkResponseSchema

export const BranchLockedErrorSchema = z.object({
  error: z.literal("branch_locked"),
  conflict_id: NonEmptyStringSchema,
})

export const UnauthorizedErrorSchema = z.object({
  error: z.literal("unauthorized"),
})

export const ErrorBodySchema = z.union([
  BranchLockedErrorSchema,
  UnauthorizedErrorSchema,
  IngestRejectedResponseSchema,
])

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>
export type IngestPayload = z.infer<typeof IngestPayloadSchema>
export type ContextRequest = z.infer<typeof ContextRequestSchema>
export type ContextResponse = z.infer<typeof ContextResponseSchema>
export type QueryRequest = z.infer<typeof QueryRequestSchema>
export type QueryResponse = z.infer<typeof QueryResponseSchema>
export type IngestAcceptedResponse = z.infer<typeof IngestAcceptedResponseSchema>
export type IngestRejectedResponse = z.infer<typeof IngestRejectedResponseSchema>
export type IngestResponse = z.infer<typeof IngestResponseSchema>
export type StatusResponse = z.infer<typeof StatusResponseSchema>
export type AuthSignupRequest = z.infer<typeof AuthSignupRequestSchema>
export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>
export type BootstrapAdminRequest = z.infer<typeof BootstrapAdminRequestSchema>
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>
export type ApiKeyCreatedResponse = z.infer<typeof ApiKeyCreatedResponseSchema>
export type ApiKey = z.infer<typeof ApiKeySchema>
export type ApiKeyListResponse = z.infer<typeof ApiKeyListResponseSchema>
export type ApiKeyDeleteRequest = z.infer<typeof ApiKeyDeleteRequestSchema>
export type ApiKeyDeleteResponse = z.infer<typeof ApiKeyDeleteResponseSchema>
export type AdminInviteCreateResponse = z.infer<typeof AdminInviteCreateResponseSchema>
export type AdminInvite = z.infer<typeof AdminInviteSchema>
export type AdminInviteListResponse = z.infer<typeof AdminInviteListResponseSchema>
export type AdminSettingsRequest = z.infer<typeof AdminSettingsRequestSchema>
export type AdminSettingsResponse = z.infer<typeof AdminSettingsResponseSchema>
export type AdminSettingsViewResponse = z.infer<typeof AdminSettingsViewResponseSchema>
export type AdminMemberDisableRequest = z.infer<typeof AdminMemberDisableRequestSchema>
export type AdminMemberDisableResponse = z.infer<typeof AdminMemberDisableResponseSchema>
export type AdminMemberListResponse = z.infer<typeof AdminMemberListResponseSchema>
export type Conflict = z.infer<typeof ConflictSchema>
export type ConflictListResponse = z.infer<typeof ConflictListResponseSchema>
export type ConflictResolveRequest = z.infer<typeof ConflictResolveRequestSchema>
export type ConflictResolveResponse = z.infer<typeof ConflictResolveResponseSchema>
export type IngestLog = z.infer<typeof IngestLogSchema>
export type QueryLog = z.infer<typeof QueryLogSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
export type IngestLogDetail = z.infer<typeof IngestLogDetailSchema>
export type QueryLogDetail = z.infer<typeof QueryLogDetailSchema>
export type IngestLogListResponse = z.infer<typeof IngestLogListResponseSchema>
export type QueryLogListResponse = z.infer<typeof QueryLogListResponseSchema>
export type WikiTreeRequest = z.infer<typeof WikiTreeRequestSchema>
export type WikiTreeResponse = z.infer<typeof WikiTreeResponseSchema>
export type WikiPageRequest = z.infer<typeof WikiPageRequestSchema>
export type WikiPageResponse = z.infer<typeof WikiPageResponseSchema>
export type WikiGraphRequest = z.infer<typeof WikiGraphRequestSchema>
export type WikiGraphNode = z.infer<typeof WikiGraphNodeSchema>
export type WikiGraphEdge = z.infer<typeof WikiGraphEdgeSchema>
export type WikiGraphResponse = z.infer<typeof WikiGraphResponseSchema>
export type GraphLayoutPosition = z.infer<typeof GraphLayoutPositionSchema>
export type GraphLayoutRequest = z.infer<typeof GraphLayoutRequestSchema>
export type GraphLayoutResponse = z.infer<typeof GraphLayoutResponseSchema>
export type GraphLayoutSaveRequest = z.infer<typeof GraphLayoutSaveRequestSchema>
export type GraphLayoutSaveResponse = z.infer<typeof GraphLayoutSaveResponseSchema>
export type WikiHistoryRequest = z.infer<typeof WikiHistoryRequestSchema>
export type WikiVersion = z.infer<typeof WikiVersionSchema>
export type WikiHistoryResponse = z.infer<typeof WikiHistoryResponseSchema>
export type AdminGitTestConnectionResponse = z.infer<typeof AdminGitTestConnectionResponseSchema>
export type AdminMemberEnableRequest = z.infer<typeof AdminMemberEnableRequestSchema>
export type AdminMemberEnableResponse = z.infer<typeof AdminMemberEnableResponseSchema>
export type BranchLockedError = z.infer<typeof BranchLockedErrorSchema>
export type UnauthorizedError = z.infer<typeof UnauthorizedErrorSchema>
export type ErrorBody = z.infer<typeof ErrorBodySchema>
