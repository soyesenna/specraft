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
  const repo = mkdtempSync(join(tmpdir(), "specraft-m4-code-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const commit = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-m4-remote-"))
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

function ingestPayload(input: {
  readonly branch: string
  readonly commit: string
  readonly sessionId: string
  readonly description: string
}): Record<string, unknown> {
  return {
    branch: input.branch,
    commit_hash: input.commit,
    agent: "codex",
    session_id: input.sessionId,
    summary: `Ingest ${input.sessionId}`,
    spec_changes: [
      { type: "added", area: "backend", description: input.description, reasoning: "test." },
    ],
    progress_updates: [],
    open_questions: [],
  }
}

describe("wiki changes_since API (M4+.1)", () => {
  it("lists pages changed after a commit and distinguishes unknown commits", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-m4-changes-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const cookie = await bootstrapAdmin(server)

    const head = async (): Promise<string> => {
      const context = await server.inject({
        method: "POST",
        url: "/api/v1/context",
        cookies: { specraft_session: cookie },
        payload: { branch: "main", commit_hash: fixture.commit },
      })
      return context.json<{ wiki_head: string }>().wiki_head
    }
    const ingest = async (sessionId: string): Promise<void> => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/ingest",
        cookies: { specraft_session: cookie },
        payload: ingestPayload({
          branch: "main",
          commit: fixture.commit,
          sessionId,
          description: `${sessionId} content.`,
        }),
      })
      expect(response.statusCode).toBe(200)
    }

    const head0 = await head()
    await ingest("c1")
    const head1 = await head()
    await ingest("c2")

    const sinceHead1 = await server.inject({
      method: "GET",
      url: `/api/v1/wiki/main/changes?since=${head1}`,
      cookies: { specraft_session: cookie },
    })
    expect(sinceHead1.statusCode).toBe(200)
    const body = sinceHead1.json<{
      branch: string
      since: string
      changes: readonly { path: string; timestamp: string; author: string; commit: string }[]
    }>()
    expect(body.branch).toBe("main")
    expect(body.since).toBe(head1)
    const paths = body.changes.map((change) => change.path)
    expect(paths).toContain("changes/c2.md")
    expect(paths).not.toContain("changes/c1.md")
    expect(body.changes[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.changes[0]?.commit.length).toBeGreaterThan(0)

    // 더 이른 기준점이면 두 ingest의 산출물이 모두 보인다.
    const sinceHead0 = await server.inject({
      method: "GET",
      url: `/api/v1/wiki/main/changes?since=${head0}`,
      cookies: { specraft_session: cookie },
    })
    const earlierPaths = sinceHead0
      .json<{ changes: readonly { path: string }[] }>()
      .changes.map((change) => change.path)
    expect(earlierPaths).toContain("changes/c1.md")
    expect(earlierPaths).toContain("changes/c2.md")

    // 형식은 유효하지만 위키에 없는 커밋 — 404.
    const unknown = await server.inject({
      method: "GET",
      url: `/api/v1/wiki/main/changes?since=${"0".repeat(40)}`,
      cookies: { specraft_session: cookie },
    })
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json()).toEqual({ error: "commit_not_found" })

    // 16진수가 아닌 since — 422.
    const malformed = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/changes?since=not-a-commit",
      cookies: { specraft_session: cookie },
    })
    expect(malformed.statusCode).toBe(422)

    // 미인증 — 401.
    const unauthorized = await server.inject({
      method: "GET",
      url: `/api/v1/wiki/main/changes?since=${head1}`,
    })
    expect(unauthorized.statusCode).toBe(401)

    await server.close()
    database.close()
  })
})

describe("wiki merge API (M4+.2)", () => {
  it("merges cleanly, locks on conflict, and resumes via conflict resolution", async () => {
    const fixture = createRemote()
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-m4-merge-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: fixture.remote })
    const cookie = await bootstrapAdmin(server)

    const touchBranch = async (branch: string): Promise<void> => {
      const context = await server.inject({
        method: "POST",
        url: "/api/v1/context",
        cookies: { specraft_session: cookie },
        payload: { branch, commit_hash: fixture.commit },
      })
      expect(context.statusCode).toBe(200)
    }
    const ingest = async (branch: string, sessionId: string): Promise<number> => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/ingest",
        cookies: { specraft_session: cookie },
        payload: ingestPayload({
          branch,
          commit: fixture.commit,
          sessionId,
          description: `${sessionId} change.`,
        }),
      })
      return response.statusCode
    }
    const treePaths = async (branch: string): Promise<readonly string[]> => {
      const tree = await server.inject({
        method: "GET",
        url: `/api/v1/wiki/${branch}/tree`,
        cookies: { specraft_session: cookie },
      })
      return tree.json<{ entries: readonly { path: string }[] }>().entries.map((e) => e.path)
    }

    // 클린 머지: feature에만 커밋 → main으로 병합.
    await touchBranch("feature")
    expect(await ingest("feature", "feat-1")).toBe(200)
    const cleanMerge = await server.inject({
      method: "POST",
      url: "/api/v1/wiki/feature/merge",
      cookies: { specraft_session: cookie },
      payload: { into: "main" },
    })
    expect(cleanMerge.statusCode).toBe(200)
    expect(cleanMerge.json()).toEqual({ status: "merged" })
    expect(await treePaths("main")).toContain("changes/feat-1.md")

    // 충돌: dev/main 양쪽이 같은 위치(log.md·index.md 말미)를 수정.
    await touchBranch("dev")
    expect(await ingest("main", "m-2")).toBe(200)
    expect(await ingest("dev", "d-1")).toBe(200)
    const conflicted = await server.inject({
      method: "POST",
      url: "/api/v1/wiki/dev/merge",
      cookies: { specraft_session: cookie },
      payload: { into: "main" },
    })
    expect(conflicted.statusCode).toBe(409)
    const conflictBody = conflicted.json<{ error: string; conflict_id: string }>()
    expect(conflictBody.error).toBe("merge_conflict")
    expect(conflictBody.conflict_id.length).toBeGreaterThan(0)

    // 기존 branch_lock 플로에 연결 — 타깃 브랜치 쓰기가 잠긴다.
    const status = await server.inject({
      method: "GET",
      url: "/api/v1/status",
      cookies: { specraft_session: cookie },
    })
    expect(
      status.json<{ branch_locks: readonly { branch: string }[] }>().branch_locks,
    ).toContainEqual(
      expect.objectContaining({ branch: "main", conflict_id: conflictBody.conflict_id }),
    )
    expect(await ingest("main", "m-3")).toBe(409)

    // 잠긴 동안 같은 병합 재시도 → 409 branch_locked (선잠금 검사).
    const retry = await server.inject({
      method: "POST",
      url: "/api/v1/wiki/dev/merge",
      cookies: { specraft_session: cookie },
      payload: { into: "main" },
    })
    expect(retry.statusCode).toBe(409)
    expect(retry.json<{ error: string }>().error).toBe("branch_locked")

    // 기존 conflict 해소 플로로 마무리하면 잠금이 풀린다.
    const resolve = await server.inject({
      method: "POST",
      url: `/api/v1/conflicts/${conflictBody.conflict_id}/resolve`,
      cookies: { specraft_session: cookie },
      payload: { directive: "prefer source branch content" },
    })
    expect(resolve.statusCode).toBe(200)
    expect(resolve.json<{ status: string }>().status).toBe("resolved")
    expect(await treePaths("main")).toContain("changes/d-1.md")
    expect(await ingest("main", "m-4")).toBe(200)

    // 자기 자신으로 병합 → 422.
    const selfMerge = await server.inject({
      method: "POST",
      url: "/api/v1/wiki/main/merge",
      cookies: { specraft_session: cookie },
      payload: { into: "main" },
    })
    expect(selfMerge.statusCode).toBe(422)

    await server.close()
    database.close()
  })

  it("branches new wiki branches from the inferred code parent branch", async () => {
    // 코드 레포: main → release(+1 commit) → feature(+1 commit).
    const repo = mkdtempSync(join(tmpdir(), "specraft-m4-parent-code-"))
    git(repo, ["init", "-b", "main"])
    git(repo, ["config", "user.email", "test@example.com"])
    git(repo, ["config", "user.name", "Test User"])
    writeFileSync(join(repo, "README.md"), "# App\n")
    git(repo, ["add", "."])
    git(repo, ["commit", "-m", "initial"])
    git(repo, ["checkout", "-b", "release"])
    writeFileSync(join(repo, "release.txt"), "release\n")
    git(repo, ["add", "."])
    git(repo, ["commit", "-m", "release work"])
    const releaseCommit = git(repo, ["rev-parse", "HEAD"])
    git(repo, ["checkout", "-b", "feature"])
    writeFileSync(join(repo, "feature.txt"), "feature\n")
    git(repo, ["add", "."])
    git(repo, ["commit", "-m", "feature work"])
    const featureCommit = git(repo, ["rev-parse", "HEAD"])
    const remote = mkdtempSync(join(tmpdir(), "specraft-m4-parent-remote-"))
    git(remote, ["init", "--bare"])
    git(repo, ["remote", "add", "origin", remote])
    git(repo, ["push", "origin", "main", "release", "feature"])

    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-m4-parent-data-"))
    const server = buildServer({ database, secret, dataDir, codeRemoteUrl: remote })
    const cookie = await bootstrapAdmin(server)

    // release 위키를 만들고 release 고유 콘텐츠를 커밋한다.
    const releaseIngest = await server.inject({
      method: "POST",
      url: "/api/v1/ingest",
      cookies: { specraft_session: cookie },
      payload: ingestPayload({
        branch: "release",
        commit: releaseCommit,
        sessionId: "rel-1",
        description: "release-only spec.",
      }),
    })
    expect(releaseIngest.statusCode).toBe(200)

    // feature 위키 최초 생성 — merge-base가 더 깊은 release가 parent로 추정되어야 한다.
    const context = await server.inject({
      method: "POST",
      url: "/api/v1/context",
      cookies: { specraft_session: cookie },
      payload: { branch: "feature", commit_hash: featureCommit },
    })
    expect(context.statusCode).toBe(200)

    const featureTree = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/feature/tree",
      cookies: { specraft_session: cookie },
    })
    const featurePaths = featureTree
      .json<{ entries: readonly { path: string }[] }>()
      .entries.map((entry) => entry.path)
    expect(featurePaths).toContain("changes/rel-1.md")

    // main에서 분기했다면 release 콘텐츠가 없어야 정상 — main은 오염되지 않았다.
    const mainTree = await server.inject({
      method: "GET",
      url: "/api/v1/wiki/main/tree",
      cookies: { specraft_session: cookie },
    })
    const mainPaths = mainTree
      .json<{ entries: readonly { path: string }[] }>()
      .entries.map((entry) => entry.path)
    expect(mainPaths).not.toContain("changes/rel-1.md")

    await server.close()
    database.close()
  })
})
