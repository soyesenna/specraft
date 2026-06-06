import { z } from "zod"

export const NonEmptyStringSchema = z.string().min(1)
export const EmailSchema = z.string().email()

const ForbiddenGitBranchCharacters = new Set(["~", "^", ":", "?", "*", "[", "\\", "]"])

function hasInvalidGitBranchCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)
    return (
      codePoint === undefined ||
      codePoint < 32 ||
      codePoint === 127 ||
      /\s/u.test(character) ||
      ForbiddenGitBranchCharacters.has(character)
    )
  })
}

export function isValidGitBranchName(value: string): boolean {
  if (
    value.length === 0 ||
    value === "@" ||
    value.startsWith("-") ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.endsWith(".") ||
    value.includes("//") ||
    value.includes("..") ||
    value.includes("@{") ||
    hasInvalidGitBranchCharacter(value)
  ) {
    return false
  }
  return value
    .split("/")
    .every((part) => part.length > 0 && !part.startsWith(".") && !part.endsWith(".lock"))
}

export const GitBranchNameSchema = z.string().min(1).refine(isValidGitBranchName)

export const AgentSchema = z.enum(["claude-code", "codex"])
export const SpecChangeTypeSchema = z.enum(["added", "modified", "removed"])
export const ProgressStatusSchema = z.enum(["planned", "in_progress", "done", "blocked"])
export const MemberRoleSchema = z.enum(["admin", "member"])
export const ConflictStateSchema = z.enum(["open", "resolving", "resolved"])
export const IngestStatusSchema = z.enum(["accepted", "rejected"])
export const IngestRejectionReasonSchema = z.enum([
  "branch_locked",
  "commit_not_found",
  "unauthorized",
  "validation_failed",
])

export const BranchStatusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("ready") }),
  z.object({ state: z.literal("locked"), conflict_id: NonEmptyStringSchema }),
  z.object({ state: z.literal("stale"), since: NonEmptyStringSchema.optional() }),
])

export const BranchLockSchema = z.object({
  branch: GitBranchNameSchema,
  conflict_id: NonEmptyStringSchema,
  reason: NonEmptyStringSchema.optional(),
})

export const CitationSchema = z.object({
  path: NonEmptyStringSchema,
  section: NonEmptyStringSchema,
})

export const SpecChangeSchema = z.object({
  type: SpecChangeTypeSchema,
  area: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  reasoning: NonEmptyStringSchema,
})

export const ProgressUpdateSchema = z.object({
  feature: NonEmptyStringSchema,
  status: ProgressStatusSchema,
  note: NonEmptyStringSchema,
})

export const MemberSchema = z.object({
  id: NonEmptyStringSchema,
  email: EmailSchema,
  name: NonEmptyStringSchema,
  role: MemberRoleSchema,
})

export const LogActorSchema = z.object({
  id: NonEmptyStringSchema,
  email: EmailSchema,
  name: NonEmptyStringSchema,
})

export const OkResponseSchema = z.object({
  status: z.literal("ok"),
})

export type Agent = z.infer<typeof AgentSchema>
export type SpecChangeType = z.infer<typeof SpecChangeTypeSchema>
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>
export type MemberRole = z.infer<typeof MemberRoleSchema>
export type ConflictState = z.infer<typeof ConflictStateSchema>
export type IngestStatus = z.infer<typeof IngestStatusSchema>
export type IngestRejectionReason = z.infer<typeof IngestRejectionReasonSchema>
export type BranchStatus = z.infer<typeof BranchStatusSchema>
export type BranchLock = z.infer<typeof BranchLockSchema>
export type Citation = z.infer<typeof CitationSchema>
export type SpecChange = z.infer<typeof SpecChangeSchema>
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>
export type Member = z.infer<typeof MemberSchema>
export type LogActor = z.infer<typeof LogActorSchema>
export type OkResponse = z.infer<typeof OkResponseSchema>
