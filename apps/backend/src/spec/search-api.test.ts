import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { MockEmbeddingProvider } from "../llm/embedding.js"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"
import { chunkWikiPage, indexWikiPages } from "./search.js"

const secret = "0123456789abcdef0123456789abcdef"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createRemote(): { readonly remote: string; readonly commit: string } {
  const repo = mkdtempSync(join(tmpdir(), "specraft-search-code-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const commit = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-search-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "origin", "main"])
  return { remote, commit }
}

type TestServer = ReturnType<typeof buildServer>

async function bootstrapAdmin(server: TestServer): Promise<string> {
  const admin = await server.inject({
    method: "POST",
    url: "/api/v1/auth/bootstrap-admin",
    payload: { email: "admin@example.com", password: "password", name: "Admin" },
  })
  return admin.cookies[0]?.value ?? ""
}

async function ingest(
  server: TestServer,
  cookie: string,
  input: { readonly commit: string; readonly sessionId: string; readonly description: string },
): Promise<void> {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/ingest",
    cookies: { specraft_session: cookie },
    payload: {
      branch: "main",
      commit_hash: input.commit,
      agent: "codex",
      session_id: input.sessionId,
      summary: `Ingest ${input.sessionId}`,
      spec_changes: [
        { type: "added", area: "backend", description: input.description, reasoning: "test." },
      ],
      progress_updates: [],
      open_questions: [],
    },
  })
  expect(response.statusCode).toBe(200)
}

// 단어 빈도 기반 결정적 벡터 — alpha/beta 축으로 코사인 랭킹을 검증한다.
function countingVector(text: string): readonly number[] {
  const lower = text.toLowerCase()
  const count = (word: string): number => lower.split(word).length - 1
  return [count("alpha"), count("beta"), 0.5]
}

describe("wiki search API (M4+.4)", () => {
  it("falls back to deterministic keyword search without an embedding provider", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-search-kw-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const cookie = await bootstrapAdmin(server)
    await ingest(server, cookie, {
      commit: fixture.commit,
      sessionId: "s1",
      description: "Quasar telemetry pipeline rollout.",
    })

    const search = async (): Promise<{
      mode: string
      results: readonly { path: string; section?: string; score: number; snippet: string }[]
    }> => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/search",
        cookies: { specraft_session: cookie },
        payload: { branch: "main", query: "quasar telemetry" },
      })
      expect(response.statusCode).toBe(200)
      return response.json()
    }

    const first = await search()
    expect(first.mode).toBe("keyword")
    expect(first.results[0]?.path).toBe("changes/s1.md")
    expect(first.results[0]?.snippet).toContain("Quasar telemetry")
    expect(first.results[0]?.score).toBeGreaterThan(0)
    // 같은 질의는 항상 같은 결과 — CI 무키 결정성.
    expect(await search()).toEqual(first)

    // top_k 상한과 검증 실패 경로.
    const limited = await server.inject({
      method: "POST",
      url: "/api/v1/search",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", query: "quasar", top_k: 1 },
    })
    expect(limited.json<{ results: readonly unknown[] }>().results).toHaveLength(1)
    const invalid = await server.inject({
      method: "POST",
      url: "/api/v1/search",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", query: "" },
    })
    expect(invalid.statusCode).toBe(422)
    const unauthorized = await server.inject({
      method: "POST",
      url: "/api/v1/search",
      payload: { branch: "main", query: "quasar" },
    })
    expect(unauthorized.statusCode).toBe(401)

    // provider가 없으면 관리 재인덱스도 거부된다(검색은 키워드 폴백으로 계속 동작).
    const reindex = await server.inject({
      method: "POST",
      url: "/api/v1/admin/search/reindex",
      cookies: { specraft_session: cookie },
      payload: { branch: "main" },
    })
    expect(reindex.statusCode).toBe(422)

    await server.close()
    database.close()
  })

  it("ranks semantically with cosine similarity once an index exists", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-search-sem-"))
    const provider = new MockEmbeddingProvider(countingVector)
    const server = buildServer({
      database,
      secret,
      dataDir,
      codeRemoteUrl: fixture.remote,
      embeddingProvider: provider,
    })
    const cookie = await bootstrapAdmin(server)
    await ingest(server, cookie, {
      commit: fixture.commit,
      sessionId: "a1",
      description: "alpha alpha alpha subsystem.",
    })
    await ingest(server, cookie, {
      commit: fixture.commit,
      sessionId: "b1",
      description: "beta beta beta subsystem.",
    })

    // ingest 경로의 증분 인덱싱이 이미 인덱스를 채웠다 — 전체 재인덱스도 동작해야 한다.
    const reindex = await server.inject({
      method: "POST",
      url: "/api/v1/admin/search/reindex",
      cookies: { specraft_session: cookie },
      payload: { branch: "main" },
    })
    expect(reindex.statusCode).toBe(200)
    expect(reindex.json<{ status: string; chunks: number }>().chunks).toBeGreaterThan(0)

    const search = await server.inject({
      method: "POST",
      url: "/api/v1/search",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", query: "alpha", top_k: 3 },
    })
    expect(search.statusCode).toBe(200)
    const body = search.json<{
      mode: string
      results: readonly { path: string; section?: string; score: number }[]
    }>()
    expect(body.mode).toBe("semantic")
    expect(body.results[0]?.path).toBe("changes/a1.md")
    expect(body.results[0]?.section).toBe("Spec Changes")
    expect(body.results).toHaveLength(3)
    const scores = body.results.map((result) => result.score)
    expect([...scores].sort((left, right) => right - left)).toEqual(scores)

    // 미인증 재인덱스는 거부.
    const unauthorized = await server.inject({
      method: "POST",
      url: "/api/v1/admin/search/reindex",
      payload: { branch: "main" },
    })
    expect(unauthorized.statusCode).toBe(401)

    await server.close()
    database.close()
  })

  it("chunks pages by section and replaces page rows on re-index (upsert)", async () => {
    expect(chunkWikiPage("intro text\n# One\nbody\n## Two\nmore")).toEqual([
      { section: "Overview", content: "intro text" },
      { section: "One", content: "# One\nbody" },
      { section: "Two", content: "## Two\nmore" },
    ])

    const database = createDatabase({ path: ":memory:" })
    const provider = new MockEmbeddingProvider()
    const countRows = (): number =>
      (
        database
          .prepare("SELECT COUNT(*) AS total FROM wiki_embeddings WHERE branch = 'main'")
          .get() as { total: number }
      ).total

    const first = await indexWikiPages({
      database,
      branch: "main",
      provider,
      pages: [{ path: "a.md", content: "# Top\nhello\n## Second\nworld" }],
    })
    expect(first).toBe(2)
    expect(countRows()).toBe(2)
    expect(provider.requests).toHaveLength(1)

    // 같은 페이지 재인덱스 — 누적이 아니라 교체되고 내용이 갱신된다.
    await indexWikiPages({
      database,
      branch: "main",
      provider,
      pages: [{ path: "a.md", content: "# Top\nrewritten body only" }],
    })
    expect(countRows()).toBe(1)
    const row = database
      .prepare(
        "SELECT section, content FROM wiki_embeddings WHERE branch = 'main' AND path = 'a.md'",
      )
      .get() as { section: string; content: string }
    expect(row.section).toBe("Top")
    expect(row.content).toContain("rewritten body only")

    database.close()
  })
})
