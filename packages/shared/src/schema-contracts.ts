import { z } from "zod"
import {
  AgentSchema,
  BranchLockSchema,
  BranchStatusSchema,
  CitationSchema,
  ConflictStateSchema,
  EmailSchema,
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
  branch: NonEmptyStringSchema,
  commit_hash: NonEmptyStringSchema,
  agent: AgentSchema,
  session_id: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  spec_changes: z.array(SpecChangeSchema).min(1),
  progress_updates: z.array(ProgressUpdateSchema),
  open_questions: z.array(z.string()),
})

export const ContextRequestSchema = z.object({
  branch: NonEmptyStringSchema,
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
  wiki_head_by_branch: z.record(NonEmptyStringSchema, NonEmptyStringSchema),
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

export const AdminSettingsRequestSchema = z.object({
  git_remote_url: NonEmptyStringSchema.optional(),
  git_credential: NonEmptyStringSchema.optional(),
  model_ingest: NonEmptyStringSchema.optional(),
  model_query: NonEmptyStringSchema.optional(),
})

export const AdminSettingsResponseSchema = OkResponseSchema

export const AdminMemberDisableRequestSchema = z.object({
  id: NonEmptyStringSchema,
})

export const AdminMemberDisableResponseSchema = OkResponseSchema

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
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>
export type ApiKeyCreatedResponse = z.infer<typeof ApiKeyCreatedResponseSchema>
export type ApiKey = z.infer<typeof ApiKeySchema>
export type ApiKeyListResponse = z.infer<typeof ApiKeyListResponseSchema>
export type ApiKeyDeleteRequest = z.infer<typeof ApiKeyDeleteRequestSchema>
export type ApiKeyDeleteResponse = z.infer<typeof ApiKeyDeleteResponseSchema>
export type AdminInviteCreateResponse = z.infer<typeof AdminInviteCreateResponseSchema>
export type AdminSettingsRequest = z.infer<typeof AdminSettingsRequestSchema>
export type AdminSettingsResponse = z.infer<typeof AdminSettingsResponseSchema>
export type AdminMemberDisableRequest = z.infer<typeof AdminMemberDisableRequestSchema>
export type AdminMemberDisableResponse = z.infer<typeof AdminMemberDisableResponseSchema>
export type Conflict = z.infer<typeof ConflictSchema>
export type ConflictListResponse = z.infer<typeof ConflictListResponseSchema>
export type ConflictResolveRequest = z.infer<typeof ConflictResolveRequestSchema>
export type ConflictResolveResponse = z.infer<typeof ConflictResolveResponseSchema>
export type IngestLog = z.infer<typeof IngestLogSchema>
export type QueryLog = z.infer<typeof QueryLogSchema>
export type IngestLogListResponse = z.infer<typeof IngestLogListResponseSchema>
export type QueryLogListResponse = z.infer<typeof QueryLogListResponseSchema>
export type WikiTreeRequest = z.infer<typeof WikiTreeRequestSchema>
export type WikiTreeResponse = z.infer<typeof WikiTreeResponseSchema>
export type WikiPageRequest = z.infer<typeof WikiPageRequestSchema>
export type WikiPageResponse = z.infer<typeof WikiPageResponseSchema>
export type BranchLockedError = z.infer<typeof BranchLockedErrorSchema>
export type UnauthorizedError = z.infer<typeof UnauthorizedErrorSchema>
export type ErrorBody = z.infer<typeof ErrorBodySchema>
