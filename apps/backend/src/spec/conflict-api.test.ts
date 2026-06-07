import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { commitWiki, createSkeletonWiki, lockBranch, writeWikiFile } from "../git/sync.js"
import { createWikiBranchFromParent, mergeWikiBranch } from "../git/wiki-merge.js"
import { buildServer } from "../server.js"
import { createDatabase } from "../storage/database.js"

const secret = "0123456789abcdef0123456789abcdef"

describe("conflict API", () => {
  it("blocks locked branches and resolves them by member directive", async () => {
    const database = createDatabase({ path: ":memory:" })
    const server = buildServer({
      database,
      dataDir: mkdtempSync(join(tmpdir(), "specraft-conflict-data-")),
      secret,
    })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""
    lockBranch(database, {
      branch: "main",
      conflictId: "conf_1",
      detail: "manual merge required",
    })

    const blocked = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", commit_hash: "abc", question: "Can I query?" },
    })
    expect(blocked.statusCode).toBe(409)
    expect(blocked.json()).toEqual({ error: "branch_locked", conflict_id: "conf_1" })

    const conflicts = await server.inject({
      method: "GET",
      url: "/api/v1/conflicts",
      cookies: { specraft_session: cookie },
    })
    expect(conflicts.statusCode).toBe(200)
    expect(conflicts.json()).toEqual({
      conflicts: [{ id: "conf_1", branch: "main", state: "open", detail: "manual merge required" }],
    })

    const resolved = await server.inject({
      method: "POST",
      url: "/api/v1/conflicts/conf_1/resolve",
      cookies: { specraft_session: cookie },
      payload: { directive: "keep the target branch wording" },
    })
    expect(resolved.statusCode).toBe(200)
    expect(resolved.json<{ status: string }>().status).toBe("resolved")

    const allowed = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", commit_hash: "abc", question: "Can I query now?" },
    })
    expect(allowed.statusCode).toBe(200)

    await server.close()
    database.close()
  })

  it("keeps a git merge conflict locked when the directive cannot resolve it", async () => {
    const database = createDatabase({ path: ":memory:" })
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-conflict-retry-"))
    const server = buildServer({ database, dataDir, secret })
    const admin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/bootstrap-admin",
      payload: { email: "admin@example.com", password: "password", name: "Admin" },
    })
    const cookie = admin.cookies[0]?.value ?? ""
    const main = createSkeletonWiki({ dataDir, branch: "main" })
    writeWikiFile(main, "areas/backend.md", "# Backend\n\nbase\n")
    commitWiki(main, {
      authorEmail: "test@example.com",
      authorName: "Test User",
      message: "base",
    })
    const feature = createWikiBranchFromParent({
      dataDir,
      branch: "feature/conflict",
      parentBranch: "main",
    })
    writeWikiFile(main, "areas/backend.md", "# Backend\n\ntarget\n")
    commitWiki(main, {
      authorEmail: "test@example.com",
      authorName: "Test User",
      message: "target",
    })
    writeWikiFile(feature, "areas/backend.md", "# Backend\n\nsource\n")
    commitWiki(feature, {
      authorEmail: "test@example.com",
      authorName: "Test User",
      message: "source",
    })
    const conflict = mergeWikiBranch({
      database,
      dataDir,
      sourceBranch: "feature/conflict",
      targetBranch: "main",
    })
    expect(conflict.status).toBe("locked")
    if (conflict.status !== "locked") {
      throw new Error("expected conflict lock")
    }

    const unresolved = await server.inject({
      method: "POST",
      url: `/api/v1/conflicts/${encodeURIComponent(conflict.conflictId)}/resolve`,
      cookies: { specraft_session: cookie },
      payload: { directive: "manual review required" },
    })
    const stillBlocked = await server.inject({
      method: "POST",
      url: "/api/v1/query",
      cookies: { specraft_session: cookie },
      payload: { branch: "main", commit_hash: "abc", question: "Can I query?" },
    })

    expect(unresolved.statusCode).toBe(200)
    expect(unresolved.json()).toEqual({ status: "still_locked" })
    expect(stillBlocked.statusCode).toBe(409)

    await server.close()
    database.close()
  })
})
