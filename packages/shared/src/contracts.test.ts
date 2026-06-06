import { describe, expect, it } from "vitest"

import {
  AdminInviteListResponseSchema,
  AdminMemberDisableResponseSchema,
  AdminMemberListResponseSchema,
  AdminSettingsRequestSchema,
  AdminSettingsResponseSchema,
  AdminSettingsViewResponseSchema,
  ApiKeyDeleteResponseSchema,
  ApiKeyListResponseSchema,
  AuthSessionResponseSchema,
  BootstrapAdminRequestSchema,
  BranchLockedErrorSchema,
  ConflictListResponseSchema,
  ContextRequestSchema,
  ContextResponseSchema,
  IngestLogListResponseSchema,
  IngestPayloadSchema,
  IngestResponseSchema,
  QueryLogListResponseSchema,
  QueryRequestSchema,
  QueryResponseSchema,
  StatusResponseSchema,
  UnauthorizedErrorSchema,
  WikiPageResponseSchema,
  WikiTreeResponseSchema,
} from "./index.js"

const member = {
  id: "mem-1",
  email: "member@example.com",
  name: "Member One",
  role: "admin",
}

describe("M1 v1 contracts", () => {
  it("parses complete v1 contract families", () => {
    const contextRequest = ContextRequestSchema.parse({
      branch: "main",
      commit_hash: "abc123",
    })
    const contextResponse = ContextResponseSchema.parse({
      overview: "# specraft",
      index: "- overview.md",
      branch_status: { state: "ready" },
      wiki_head: "def456",
    })
    const queryRequest = QueryRequestSchema.parse({
      branch: "main",
      commit_hash: "abc123",
      question: "What is M1?",
    })
    const queryResponse = QueryResponseSchema.parse({
      answer: "M1 fixes the shared contract.",
      citations: [{ path: "overview.md", section: "Goal" }],
      query_id: "qry-1",
    })
    const ingestPayload = IngestPayloadSchema.parse({
      branch: "feat/contracts",
      commit_hash: "abc123",
      agent: "codex",
      session_id: "session-001",
      summary: "Added M1 shared contracts.",
      spec_changes: [
        {
          type: "added",
          area: "packages/shared",
          description: "Added v1 API schemas.",
          reasoning: "M1 requires frozen contracts before downstream work.",
        },
      ],
      progress_updates: [{ feature: "M1 contracts", status: "done", note: "Schemas pass." }],
      open_questions: [],
    })
    const ingestResponse = IngestResponseSchema.parse({
      status: "accepted",
      wiki_commit: "fedcba",
    })
    const statusResponse = StatusResponseSchema.parse({
      server: "ok",
      branch_locks: [],
      wiki_head_by_branch: { main: "def456" },
    })
    const authSession = AuthSessionResponseSchema.parse({ member })
    const bootstrapAdmin = BootstrapAdminRequestSchema.parse({
      email: "admin@example.com",
      password: "password",
      name: "Admin One",
    })
    const keyList = ApiKeyListResponseSchema.parse({
      keys: [
        {
          id: "key-1",
          prefix: "sk-spcrft-test",
          name: "default",
          created_at: "2026-06-06T00:00:00Z",
          revoked_at: null,
        },
      ],
    })
    const conflictList = ConflictListResponseSchema.parse({
      conflicts: [{ id: "conf-1", branch: "main", state: "open", detail: "Needs directive." }],
    })
    const settingsView = AdminSettingsViewResponseSchema.parse({
      git_remote_url: "ssh://git.example/repo.git",
      model_ingest: "openrouter/auto",
      model_query: "openrouter/auto",
      credential_configured: true,
    })
    const inviteList = AdminInviteListResponseSchema.parse({
      invites: [
        {
          token: "invite-token",
          expires_at: "2026-06-06T00:00:00Z",
          used_at: null,
          used_by: null,
        },
      ],
    })
    const memberList = AdminMemberListResponseSchema.parse({ members: [member] })
    const ingestLogs = IngestLogListResponseSchema.parse({
      logs: [
        {
          id: "ing-1",
          member,
          branch: "main",
          commit_hash: "abc123",
          status: "accepted",
          summary: "Updated wiki.",
          created_at: "2026-06-06T00:00:00Z",
        },
      ],
      next_cursor: null,
    })
    const queryLogs = QueryLogListResponseSchema.parse({
      logs: [
        {
          id: "qry-log-1",
          member,
          branch: "main",
          question: "What changed?",
          created_at: "2026-06-06T00:00:00Z",
        },
      ],
      next_cursor: "next",
    })
    const wikiTree = WikiTreeResponseSchema.parse({
      branch: "main",
      entries: [{ path: "index.md", type: "file" }],
    })
    const wikiPage = WikiPageResponseSchema.parse({
      branch: "main",
      path: "index.md",
      content: "# Index",
    })

    expect(contextRequest.branch).toBe("main")
    expect(contextResponse.wiki_head).toBe("def456")
    expect(queryRequest.question).toContain("M1")
    expect(queryResponse.citations[0]?.path).toBe("overview.md")
    expect(ingestPayload.spec_changes[0]?.type).toBe("added")
    expect(ingestResponse.status).toBe("accepted")
    expect(statusResponse.server).toBe("ok")
    expect(authSession.member.email).toBe("member@example.com")
    expect(bootstrapAdmin.email).toBe("admin@example.com")
    expect(keyList.keys[0]?.prefix).toBe("sk-spcrft-test")
    expect(ApiKeyDeleteResponseSchema.parse({ status: "ok" }).status).toBe("ok")
    expect(AdminSettingsRequestSchema.parse({ model_query: "openrouter/auto" }).model_query).toBe(
      "openrouter/auto",
    )
    expect(AdminSettingsResponseSchema.parse({ status: "ok" }).status).toBe("ok")
    expect(settingsView.credential_configured).toBe(true)
    expect(inviteList.invites[0]?.used_at).toBeNull()
    expect(memberList.members[0]?.role).toBe("admin")
    expect(AdminMemberDisableResponseSchema.parse({ status: "ok" }).status).toBe("ok")
    expect(conflictList.conflicts[0]?.state).toBe("open")
    expect(ingestLogs.logs[0]?.member.name).toBe("Member One")
    expect(queryLogs.next_cursor).toBe("next")
    expect(wikiTree.entries[0]?.path).toBe("index.md")
    expect(wikiPage.content).toBe("# Index")
  })

  it("rejects malformed ingest and preserves M1 error bodies", () => {
    const malformed = IngestPayloadSchema.safeParse({
      branch: "",
      commit_hash: "abc123",
      agent: "codex",
      session_id: "session-001",
      summary: "",
      spec_changes: [],
      progress_updates: [],
      open_questions: [],
    })
    const commitMissing = IngestResponseSchema.parse({
      status: "rejected",
      reason: "commit_not_found",
    })
    const branchLocked = BranchLockedErrorSchema.parse({
      error: "branch_locked",
      conflict_id: "conflict-001",
    })
    const unauthorized = UnauthorizedErrorSchema.parse({ error: "unauthorized" })

    expect(malformed.success).toBe(false)
    expect(commitMissing.status).toBe("rejected")
    if (commitMissing.status === "rejected") {
      expect(commitMissing.reason).toBe("commit_not_found")
    }
    expect(branchLocked.conflict_id).toBe("conflict-001")
    expect(unauthorized.error).toBe("unauthorized")
  })
})
