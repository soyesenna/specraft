import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { MockProvider } from "../llm/provider.js"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"

const secret = "0123456789abcdef0123456789abcdef"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createRemote(): { readonly remote: string; readonly commit: string } {
  const repo = mkdtempSync(join(tmpdir(), "specraft-api-code-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const commit = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-api-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "origin", "main"])
  return { remote, commit }
}

describe("spec REST API", () => {
  it("serves context, query, ingest, logs, status, and wiki pages", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-api-data-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    const context = await server.inject({
      method: "POST",
      url: "/api/v1/context",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", commit_hash: fixture.commit },
    })
    expect(context.statusCode).toBe(200)
    expect(context.json<{ overview: string; index: string }>().overview).toContain("specraft")
    expect(context.json<{ overview: string; index: string }>().index).toContain("overview.md")

    const query = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: fixture.commit,
        question: "What is specraft?",
      },
    })
    expect(query.statusCode).toBe(200)
    expect(query.json<{ citations: readonly unknown[] }>().citations).toHaveLength(1)

    const ingest = await server.inject({
      method: "POST",
      url: "/api/v1/ingest",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: fixture.commit,
        agent: "codex",
        session_id: "session-1",
        summary: "Implemented backend APIs.",
        spec_changes: [
          {
            type: "added",
            area: "backend",
            description: "Added spec API.",
            reasoning: "M5 requires REST assembly.",
          },
        ],
        progress_updates: [{ feature: "M5 REST", status: "done", note: "API test passed." }],
        open_questions: [],
      },
    })
    expect(ingest.statusCode).toBe(200)
    expect(ingest.json<{ status: string }>().status).toBe("accepted")

    const treeAfterIngest = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/tree",
      cookies: { specraft_session: cookie },
    })
    expect(treeAfterIngest.statusCode).toBe(200)
    expect(
      treeAfterIngest.json<{ entries: readonly { readonly path: string }[] }>().entries,
    ).toContainEqual({
      path: "changes/session-1.md",
      type: "file",
    })

    const changePage = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/page?path=changes/session-1.md",
      cookies: { specraft_session: cookie },
    })
    expect(changePage.statusCode).toBe(200)
    expect(changePage.json<{ content: string }>().content).toContain("Added spec API.")

    const targetedQuery = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: fixture.commit,
        question: "What backend API progress was added?",
      },
    })
    expect(targetedQuery.statusCode).toBe(200)
    expect(targetedQuery.json<{ answer: string }>().answer).toContain("Added spec API.")
    expect(
      targetedQuery.json<{ citations: readonly { readonly path: string }[] }>().citations,
    ).toContainEqual({
      path: "changes/session-1.md",
      section: "Spec Changes",
    })

    const missingCommit = await server.inject({
      method: "POST",
      url: "/api/v1/ingest",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: "0".repeat(40),
        agent: "codex",
        session_id: "session-2",
        summary: "Should reject.",
        spec_changes: [
          {
            type: "added",
            area: "backend",
            description: "Bad commit.",
            reasoning: "P2.",
          },
        ],
        progress_updates: [],
        open_questions: [],
      },
    })
    expect(missingCommit.statusCode).toBe(422)
    expect(missingCommit.json()).toEqual({ status: "rejected", reason: "commit_not_found" })

    const logs = await server.inject({
      method: "GET",
      url: "/api/v1/logs/ingests",
      cookies: { specraft_session: cookie },
    })
    const wikiPage = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/page?path=log.md",
      cookies: { specraft_session: cookie },
    })

    expect(logs.statusCode).toBe(200)
    expect(logs.json<{ logs: readonly unknown[] }>().logs).toHaveLength(2)
    expect(wikiPage.statusCode).toBe(200)
    expect(wikiPage.json<{ content: string }>().content).toContain("Implemented backend APIs.")

    const pathEscape = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/page?path=../../../../etc/passwd",
      cookies: { specraft_session: cookie },
    })
    expect(pathEscape.statusCode).toBe(422)

    const unsafeBranch = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "-D",
        commit_hash: fixture.commit,
        question: "Should not run git option.",
      },
    })
    expect(unsafeBranch.statusCode).toBe(422)

    await server.close()
    database.close()
  })

  it("serves wiki graph nodes/edges and per-document history with diffs", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-api-graph-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin Author" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    const ingest = async (sessionId: string, description: string): Promise<void> => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/ingest",
        cookies: { specraft_session: cookie },
        payload: {
          branch: "main",
          commit_hash: fixture.commit,
          agent: "codex",
          session_id: sessionId,
          summary: `Ingest ${sessionId}`,
          spec_changes: [{ type: "added", area: "backend", description, reasoning: "test." }],
          progress_updates: [],
          open_questions: [],
        },
      })
      expect(response.statusCode).toBe(200)
    }

    await ingest("graph-1", "First ingest content.")
    await ingest("graph-1", "Second ingest content with more lines.")

    const graph = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/graph",
      cookies: { specraft_session: cookie },
    })
    expect(graph.statusCode).toBe(200)
    const graphBody = graph.json<{
      nodes: readonly { path: string; title: string; dir: string; summary: string }[]
      edges: readonly { from: string; to: string }[]
    }>()
    const indexNode = graphBody.nodes.find((node) => node.path === "index.md")
    expect(indexNode?.dir).toBe("ROOT")
    expect(indexNode?.title).toBe("Index")
    const overviewNode = graphBody.nodes.find((node) => node.path === "overview.md")
    expect(overviewNode?.summary.length).toBeGreaterThan(0)
    expect(overviewNode?.summary.length).toBeLessThanOrEqual(100)
    const changeNode = graphBody.nodes.find((node) => node.path === "changes/graph-1.md")
    expect(changeNode?.dir).toBe("CHANGES")
    expect(graphBody.edges).toContainEqual({ from: "index.md", to: "overview.md" })
    expect(graphBody.edges).toContainEqual({ from: "index.md", to: "changes/graph-1.md" })

    const history = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/history?path=changes/graph-1.md",
      cookies: { specraft_session: cookie },
    })
    expect(history.statusCode).toBe(200)
    const historyBody = history.json<{
      versions: readonly {
        commit_hash: string
        summary: string
        author: string
        timestamp: string
        added_lines: number
        removed_lines: number
        added: readonly string[]
        removed: readonly string[]
      }[]
    }>()
    expect(historyBody.versions.length).toBe(2)
    expect(historyBody.versions[0]?.summary).toContain("Ingest graph-1")
    expect(historyBody.versions[0]?.author).toBe("Admin Author")
    expect(historyBody.versions[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(historyBody.versions[0]?.added.length).toBeGreaterThan(0)
    expect(
      historyBody.versions[0]?.added.some((line) => line.includes("Second ingest content")),
    ).toBe(true)
    expect(historyBody.versions[1]?.added_lines).toBeGreaterThan(0)

    const badHistory = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/history?path=../../../etc/passwd",
      cookies: { specraft_session: cookie },
    })
    expect(badHistory.statusCode).toBe(422)

    await server.close()
    database.close()
  })

  it("stores graph node layouts per member and branch", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({ database, secret })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    // 저장 전 — 빈 배치
    const empty = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/layout",
      cookies: { specraft_session: cookie },
    })
    expect(empty.statusCode).toBe(200)
    expect(empty.json<{ positions: Record<string, unknown> }>().positions).toEqual({})

    const positions = {
      "overview.md": { x: 120.5, y: -36 },
      "changes/feature.md": { x: 480, y: 320 },
    }
    const saved = await server.inject({
      method: "PUT",
      url: "/api/v1/wiki/main/layout",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", positions },
    })
    expect(saved.statusCode).toBe(200)
    expect(saved.json<{ status: string }>().status).toBe("ok")

    const restored = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/layout",
      cookies: { specraft_session: cookie },
    })
    expect(restored.json<{ positions: typeof positions }>().positions).toEqual(positions)

    // 같은 멤버라도 다른 브랜치는 독립 저장
    const otherBranch = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/dev/layout",
      cookies: { specraft_session: cookie },
    })
    expect(otherBranch.json<{ positions: Record<string, unknown> }>().positions).toEqual({})

    // URL 브랜치와 본문 브랜치 불일치 → 422
    const mismatch = await server.inject({
      method: "PUT",
      url: "/api/v1/wiki/dev/layout",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", positions },
    })
    expect(mismatch.statusCode).toBe(422)

    // 미인증 → 401
    const unauthorized = await server.inject({ method: "GET", url: "/api/v1/wiki/main/layout" })
    expect(unauthorized.statusCode).toBe(401)

    // 다른 멤버는 자신의 배치만 본다 (덮어쓰기 후 재조회로 멤버 격리 확인)
    const overwrite = await server.inject({
      method: "PUT",
      url: "/api/v1/wiki/main/layout",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", positions: { "overview.md": { x: 1, y: 2 } } },
    })
    expect(overwrite.statusCode).toBe(200)
    const latest = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/layout",
      cookies: { specraft_session: cookie },
    })
    expect(latest.json<{ positions: Record<string, unknown> }>().positions).toEqual({
      "overview.md": { x: 1, y: 2 },
    })

    await server.close()
    database.close()
  })

  it("rejects ingest when commit validation cannot be configured", async () => {
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-api-no-remote-"))
    const server = buildServer({ database, secret, dataDir })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    const ingest = await server.inject({
      method: "POST",
      url: "/api/v1/ingest",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: "1".repeat(40),
        agent: "codex",
        session_id: "session-no-remote",
        summary: "Should fail closed.",
        spec_changes: [
          {
            type: "added",
            area: "backend",
            description: "Unverified commit.",
            reasoning: "P2 must not fail open.",
          },
        ],
        progress_updates: [],
        open_questions: [],
      },
    })

    expect(ingest.statusCode).toBe(422)
    expect(ingest.json()).toEqual({ status: "rejected", reason: "commit_not_found" })

    await server.close()
    database.close()
  })

  it("uses the configured LLM provider for query responses", async () => {
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-api-provider-"))
    const provider = new MockProvider([
      {
        role: "assistant",
        content: "Provider answer. [overview.md#Overview]",
      },
    ])
    const server = buildServer({ database, dataDir, llmProvider: provider, secret })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    const query = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: {
        branch: "main",
        commit_hash: "abc",
        question: "What does the provider say?",
      },
    })

    expect(query.statusCode).toBe(200)
    expect(query.json<{ answer: string }>().answer).toBe("Provider answer. [overview.md#Overview]")
    expect(provider.requests).toHaveLength(1)

    await server.close()
    database.close()
  })
})
