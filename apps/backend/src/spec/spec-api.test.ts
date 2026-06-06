import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
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
})
