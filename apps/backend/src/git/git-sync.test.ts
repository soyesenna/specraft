import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { createDatabase } from "../storage/database.js"
import { BranchQueue } from "./branch-queue.js"
import {
  commitExists,
  commitWiki,
  createCodeMirror,
  createSkeletonWiki,
  detectNonFastForward,
  listWikiFiles,
  lockBranch,
  readWikiFile,
  sortCommitsTopologically,
  writeWikiFile,
} from "./sync.js"
import {
  createWikiBranchFromParent,
  mergeWikiBranch,
  resolveLockedWikiMerge,
} from "./wiki-merge.js"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createFixtureRepo(): {
  readonly remote: string
  readonly first: string
  readonly second: string
} {
  const repo = mkdtempSync(join(tmpdir(), "specraft-code-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "spec.md"), "first\n")
  git(repo, ["add", "spec.md"])
  git(repo, ["commit", "-m", "first"])
  const first = git(repo, ["rev-parse", "HEAD"])
  writeFileSync(join(repo, "spec.md"), "second\n")
  git(repo, ["commit", "-am", "second"])
  const second = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "origin", "main"])
  return { remote, first, second }
}

describe("git sync and wiki core", () => {
  it("mirrors code commits and sorts ingest work by git topology", () => {
    const fixture = createFixtureRepo()
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-data-"))
    const mirror = createCodeMirror({ dataDir, remoteUrl: fixture.remote })

    expect(commitExists(mirror, fixture.first)).toBe(true)
    expect(commitExists(mirror, "0".repeat(40))).toBe(false)
    expect(sortCommitsTopologically(mirror, [fixture.second, fixture.first])).toEqual([
      fixture.first,
      fixture.second,
    ])
    expect(detectNonFastForward(mirror, fixture.second, fixture.first)).toBe(true)
    expect(detectNonFastForward(mirror, fixture.first, fixture.second)).toBe(false)
  })

  it("initializes wiki skeleton and persists branch locks", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-wiki-"))
    const database = createDatabase({ path: ":memory:" })
    const wiki = createSkeletonWiki({ dataDir, branch: "main" })

    expect(listWikiFiles(wiki)).toEqual(["index.md", "log.md", "overview.md"])
    lockBranch(database, {
      branch: "feature/conflict",
      conflictId: "conf_1",
      detail: "manual merge required",
    })
    expect(
      database
        .prepare("SELECT conflict_id FROM branch_locks WHERE branch = ?")
        .get("feature/conflict"),
    ).toEqual({ conflict_id: "conf_1" })
    database.close()
  })

  it("serializes branch jobs with a per-branch queue", async () => {
    const queue = new BranchQueue()
    const events: string[] = []

    const first = queue.run("main", async () => {
      events.push("first:start")
      await queue.run("feature", async () => {
        events.push("feature")
      })
      events.push("first:end")
      return "first"
    })
    const second = queue.run("main", async () => {
      events.push("second")
      return "second"
    })

    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"])
    expect(events).toEqual(["first:start", "feature", "first:end", "second"])
  })

  it("creates wiki branches from parent commits and merges them back", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-wiki-merge-"))
    const database = createDatabase({ path: ":memory:" })
    const main = createSkeletonWiki({ dataDir, branch: "main" })
    writeWikiFile(main, "areas/backend.md", "# Backend\n\nbefore\n")
    commitWiki(main, {
      authorEmail: "test@example.com",
      authorName: "Test User",
      message: "main baseline",
    })

    const feature = createWikiBranchFromParent({
      dataDir,
      branch: "feature/rest",
      parentBranch: "main",
    })
    writeWikiFile(feature, "areas/backend.md", "# Backend\n\nafter\n")
    commitWiki(feature, {
      authorEmail: "test@example.com",
      authorName: "Test User",
      message: "feature update",
    })

    expect(
      mergeWikiBranch({ database, dataDir, targetBranch: "main", sourceBranch: "feature/rest" }),
    ).toEqual({ status: "merged" })
    expect(
      readWikiFile(createSkeletonWiki({ dataDir, branch: "main" }), "areas/backend.md"),
    ).toContain("after")
    database.close()
  })

  it("locks conflicting wiki merges and keeps the lock until a successful retry", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-wiki-conflict-"))
    const database = createDatabase({ path: ":memory:" })
    database
      .prepare<[string, string, string, string, string, string]>(
        "INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("mem_1", "test@example.com", "hash", "Test User", "admin", new Date().toISOString())
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
      targetBranch: "main",
      sourceBranch: "feature/conflict",
    })
    expect(conflict.status).toBe("locked")
    if (conflict.status !== "locked") {
      throw new Error("expected conflict lock")
    }

    expect(
      resolveLockedWikiMerge(database, {
        dataDir,
        directive: "manual review required",
        id: conflict.conflictId,
        memberId: "mem_1",
      }),
    ).toEqual({ status: "still_locked" })
    expect(
      resolveLockedWikiMerge(database, {
        dataDir,
        directive: "accept source branch changes",
        id: conflict.conflictId,
        memberId: "mem_1",
      }).status,
    ).toBe("resolved")
    expect(
      readWikiFile(createSkeletonWiki({ dataDir, branch: "main" }), "areas/backend.md"),
    ).toContain("source")
    database.close()
  })
})
