import { describe, expect, it } from "vitest"

import type {
  AdminMemberDisableRequest,
  ApiKeyDeleteRequest,
  ConflictResolveRequest,
  PaginationRequest,
  WikiPageRequest,
  WikiTreeRequest,
} from "./index.js"
import { createSpecraftClient } from "./index.js"

const member = {
  id: "mem-1",
  email: "member@example.com",
  name: "Member One",
  role: "admin",
}

describe("Specraft client", () => {
  it("wraps every M1 REST route with request and response schemas", async () => {
    const calls: Array<{
      readonly url: string
      readonly method: string
      readonly body: string
      readonly contentType: string | null
    }> = []
    const responseByRoute = new Map<string, unknown>([
      [
        "POST /api/v1/context",
        {
          overview: "# specraft",
          index: "index",
          branch_status: { state: "ready" },
          wiki_head: "h",
        },
      ],
      ["POST /api/v1/query", { answer: "A", citations: [], query_id: "qry-1" }],
      ["POST /api/v1/ingest", { status: "accepted", wiki_commit: "wiki-1" }],
      ["GET /api/v1/status", { server: "ok", branch_locks: [], wiki_head_by_branch: {} }],
      ["GET /api/v1/auth/session", { member }],
      ["POST /api/v1/auth/bootstrap-admin", { member }],
      ["POST /api/v1/auth/signup", { member }],
      ["POST /api/v1/auth/login", { member }],
      ["POST /api/v1/auth/logout", { status: "ok" }],
      ["POST /api/v1/keys", { id: "key-1", api_key: "sk-spcrft-secret" }],
      ["GET /api/v1/keys", { keys: [] }],
      ["DELETE /api/v1/keys", { status: "ok" }],
      [
        "POST /api/v1/admin/invites",
        { invite_url: "https://specraft.test/invite", expires_at: "t" },
      ],
      [
        "GET /api/v1/admin/invites",
        {
          invites: [
            {
              token: "invite-token",
              created_at: "2026-06-05T00:00:00Z",
              created_by: null,
              expires_at: "2026-06-06T00:00:00Z",
              used_at: null,
              used_by: null,
            },
          ],
        },
      ],
      [
        "GET /api/v1/admin/settings",
        {
          git_remote_url: "ssh://git.example/repo.git",
          model_ingest: "openrouter/auto",
          model_query: "openrouter/auto",
          credential_configured: true,
        },
      ],
      ["PUT /api/v1/admin/settings", { status: "ok" }],
      ["GET /api/v1/admin/members", { members: [member] }],
      ["PUT /api/v1/admin/members/mem-1/disable", { status: "ok" }],
      ["GET /api/v1/conflicts", { conflicts: [] }],
      ["POST /api/v1/conflicts/conf-1/resolve", { status: "resolved" }],
      ["GET /api/v1/logs/ingests", { logs: [], next_cursor: null }],
      ["GET /api/v1/logs/queries", { logs: [], next_cursor: null }],
      ["GET /api/v1/wiki/main/tree", { branch: "main", entries: [] }],
      ["GET /api/v1/wiki/main/page", { branch: "main", path: "index.md", content: "# Index" }],
      ["GET /api/v1/wiki/main/graph", { branch: "main", nodes: [], edges: [] }],
      ["GET /api/v1/wiki/main/history", { branch: "main", path: "index.md", versions: [] }],
      ["POST /api/v1/admin/git/test-connection", { status: "ok" }],
      ["POST /api/v1/admin/members/enable", { status: "ok" }],
    ])
    const client = createSpecraftClient({
      baseUrl: "https://specraft.test",
      apiKey: "sk-spcrft-test",
      fetch: async (input, init) => {
        const url = new URL(input)
        const method = init?.method ?? "GET"
        calls.push({
          url: input.toString(),
          method,
          body: init?.body?.toString() ?? "",
          contentType: new Headers(init?.headers).get("content-type"),
        })
        const responseBody = responseByRoute.get(`${method} ${url.pathname}`)
        return new Response(JSON.stringify(responseBody ?? { error: "unauthorized" }), {
          status: responseBody ? 200 : 401,
          headers: { "content-type": "application/json" },
        })
      },
    })
    const keyDelete: ApiKeyDeleteRequest = { id: "key-1" }
    const memberDisable: AdminMemberDisableRequest = { id: "mem-1" }
    const conflictResolve: ConflictResolveRequest = { id: "conf-1", directive: "merge main" }
    const pagination: PaginationRequest = { cursor: "cur-1", limit: 10 }
    const wikiTree: WikiTreeRequest = { branch: "main" }
    const wikiPage: WikiPageRequest = { branch: "main", path: "index.md" }

    await client.context({ branch: "main", commit_hash: "abc123" })
    await client.query({ branch: "main", commit_hash: "abc123", question: "What changed?" })
    await client.ingest({
      branch: "main",
      commit_hash: "abc123",
      agent: "codex",
      session_id: "session-1",
      summary: "Updated spec.",
      spec_changes: [
        {
          type: "modified",
          area: "M1",
          description: "Expanded contracts.",
          reasoning: "Spec §9.3.",
        },
      ],
      progress_updates: [],
      open_questions: [],
    })
    await client.status()
    await client.authSession()
    await client.bootstrapAdmin({
      email: "admin@example.com",
      password: "password",
      name: "Admin One",
    })
    await client.authSignup({
      invite_token: "token",
      email: "member@example.com",
      password: "password",
      name: "Member One",
    })
    await client.authLogin({ email: "member@example.com", password: "password" })
    await client.authLogout()
    await client.createApiKey({ name: "default" })
    await client.listApiKeys()
    await client.deleteApiKey(keyDelete)
    await client.createAdminInvite()
    await client.listAdminInvites()
    await client.getAdminSettings()
    await client.updateAdminSettings({ git_remote_url: "ssh://git.example/repo.git" })
    await client.listAdminMembers()
    await client.disableAdminMember(memberDisable)
    await client.listConflicts()
    await client.resolveConflict(conflictResolve)
    await client.listIngestLogs(pagination)
    await client.listQueryLogs()
    await client.wikiTree(wikiTree)
    await client.wikiPage(wikiPage)
    await client.wikiGraph({ branch: "main" })
    await client.wikiHistory({ branch: "main", path: "index.md" })
    await client.testGitConnection()
    await client.enableAdminMember({ id: "mem-1" })

    expect(calls).toHaveLength(28)
    expect(calls).toContainEqual({
      url: "https://specraft.test/api/v1/admin/members/mem-1/disable",
      method: "PUT",
      body: "",
      contentType: null,
    })
    expect(calls).toContainEqual({
      url: "https://specraft.test/api/v1/logs/ingests?cursor=cur-1&limit=10",
      method: "GET",
      body: "",
      contentType: null,
    })
    expect(calls).toContainEqual({
      url: "https://specraft.test/api/v1/wiki/main/page?path=index.md",
      method: "GET",
      body: "",
      contentType: null,
    })
    expect(calls).toContainEqual({
      url: "https://specraft.test/api/v1/wiki/main/history?path=index.md",
      method: "GET",
      body: "",
      contentType: null,
    })
    expect(calls.find((call) => call.url.endsWith("/api/v1/admin/members/enable"))?.body).toBe(
      JSON.stringify({ id: "mem-1" }),
    )
    expect(calls.find((call) => call.url.endsWith("/api/v1/auth/logout"))?.contentType).toBeNull()
    expect(calls.find((call) => call.url.endsWith("/api/v1/admin/invites"))?.contentType).toBeNull()
    expect(calls.find((call) => call.url.endsWith("/api/v1/conflicts/conf-1/resolve"))?.body).toBe(
      JSON.stringify({ directive: "merge main" }),
    )
    expect(
      calls.find((call) => call.url.endsWith("/api/v1/conflicts/conf-1/resolve"))?.contentType,
    ).toBe("application/json")
  })
})
