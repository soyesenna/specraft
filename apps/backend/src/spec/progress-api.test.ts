import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"
import { migrateDatabase } from "../storage/migrations.js"
import { listFeatureProgress } from "./progress.js"

const secret = "0123456789abcdef0123456789abcdef"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createRemote(): { readonly remote: string; readonly commit: string } {
  const repo = mkdtempSync(join(tmpdir(), "specraft-progress-code-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const commit = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-progress-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "origin", "main"])
  return { remote, commit }
}

describe("feature progress board (M4+.3)", () => {
  it("aggregates ingest progress_updates into latest per-feature state", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-progress-data-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""

    const ingest = async (
      branch: string,
      sessionId: string,
      updates: readonly { feature: string; status: string; note: string }[],
    ): Promise<void> => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/ingest",
        cookies: { specraft_session: cookie },
        payload: {
          branch,
          commit_hash: fixture.commit,
          agent: "codex",
          session_id: sessionId,
          summary: `Ingest ${sessionId}`,
          spec_changes: [
            { type: "added", area: "backend", description: "change.", reasoning: "test." },
          ],
          progress_updates: updates,
          open_questions: [],
        },
      })
      expect(response.statusCode).toBe(200)
    }

    await ingest("main", "p1", [{ feature: "Search", status: "in_progress", note: "indexing WIP" }])
    await ingest("main", "p2", [
      { feature: "Search", status: "done", note: "shipped" },
      { feature: "Board", status: "planned", note: "next up" },
    ])
    await ingest("dev", "p3", [{ feature: "Search", status: "blocked", note: "branch only" }])

    // upsert 최신성 — 같은 feature는 마지막 ingest가 이긴다.
    const mainBoard = await server.inject({
      method: "GET",
      url: "/api/v1/progress?branch=main",
      cookies: { specraft_session: cookie },
    })
    expect(mainBoard.statusCode).toBe(200)
    const mainItems = mainBoard.json<{
      items: readonly {
        feature: string
        status: string
        note: string
        branch: string
        updated_at: string
        source_ingest_id: string
      }[]
    }>().items
    expect(mainItems).toHaveLength(2)
    const search = mainItems.find((item) => item.feature === "Search")
    expect(search?.status).toBe("done")
    expect(search?.note).toBe("shipped")
    expect(search?.branch).toBe("main")
    expect(search?.source_ingest_id).toMatch(/^ing_/)
    expect(search?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(mainItems.find((item) => item.feature === "Board")?.status).toBe("planned")

    // 브랜치 격리 — dev 보드는 dev의 상태만 본다.
    const devBoard = await server.inject({
      method: "GET",
      url: "/api/v1/progress?branch=dev",
      cookies: { specraft_session: cookie },
    })
    const devItems = devBoard.json<{ items: readonly { status: string }[] }>().items
    expect(devItems).toHaveLength(1)
    expect(devItems[0]?.status).toBe("blocked")

    // branch 미지정 — 전 브랜치 집계.
    const allBoard = await server.inject({
      method: "GET",
      url: "/api/v1/progress",
      cookies: { specraft_session: cookie },
    })
    expect(allBoard.json<{ items: readonly unknown[] }>().items).toHaveLength(3)

    // 안전하지 않은 브랜치 쿼리 → 422, 미인증 → 401.
    const unsafe = await server.inject({
      method: "GET",
      url: "/api/v1/progress?branch=-D",
      cookies: { specraft_session: cookie },
    })
    expect(unsafe.statusCode).toBe(422)
    const unauthorized = await server.inject({ method: "GET", url: "/api/v1/progress" })
    expect(unauthorized.statusCode).toBe(401)

    await server.close()
    database.close()
  })

  it("backfills historical ingest logs once and never overwrites newer rows", () => {
    const database = createDatabase({ path: ":memory:" })
    database
      .prepare(
        `INSERT INTO members (id, email, password_hash, name, role, created_at)
         VALUES ('mem-1', 'a@example.com', 'hash', 'A', 'admin', '2026-01-01T00:00:00Z')`,
      )
      .run()
    const insertLog = database.prepare(
      `INSERT INTO ingest_logs (id, member_id, branch, commit_hash, status, summary, progress_updates, created_at)
       VALUES (?, 'mem-1', ?, 'abc', ?, 's', ?, ?)`,
    )
    insertLog.run(
      "ing_old",
      "main",
      "accepted",
      JSON.stringify([{ feature: "Gate", status: "in_progress", note: "wip" }]),
      "2026-01-02T00:00:00Z",
    )
    insertLog.run(
      "ing_new",
      "main",
      "accepted",
      JSON.stringify([{ feature: "Gate", status: "done", note: "shipped" }]),
      "2026-01-03T00:00:00Z",
    )
    // rejected ingest와 깨진 JSON은 백필에서 무시된다.
    insertLog.run(
      "ing_rej",
      "main",
      "rejected",
      JSON.stringify([{ feature: "Gate", status: "blocked", note: "rejected" }]),
      "2026-01-04T00:00:00Z",
    )
    insertLog.run("ing_bad", "main", "accepted", "{not json", "2026-01-05T00:00:00Z")

    // feature_progress가 비어 있으므로 재마이그레이션이 백필을 수행한다.
    migrateDatabase(database)
    const items = listFeatureProgress(database, "main")
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      feature: "Gate",
      status: "done",
      note: "shipped",
      source_ingest_id: "ing_new",
      updated_at: "2026-01-03T00:00:00Z",
    })

    // 테이블이 비어 있지 않으면 백필은 다시 돌지 않는다 — 최신 상태를 과거 로그로 덮지 않는다.
    database
      .prepare(
        `UPDATE feature_progress SET status = 'blocked', note = 'manual' WHERE feature = 'Gate'`,
      )
      .run()
    migrateDatabase(database)
    expect(listFeatureProgress(database, "main")[0]?.status).toBe("blocked")

    database.close()
  })
})
