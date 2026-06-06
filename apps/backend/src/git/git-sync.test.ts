import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { createDatabase } from "../storage/database.js"
import {
  commitExists,
  createCodeMirror,
  createSkeletonWiki,
  listWikiFiles,
  lockBranch,
  sortCommitsTopologically,
} from "./sync.js"

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
})
