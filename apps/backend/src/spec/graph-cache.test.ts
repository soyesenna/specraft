import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { beforeEach, describe, expect, it } from "vitest"

import { commitWiki, createSkeletonWiki, wikiBranchTip, writeWikiFile } from "../git/sync.js"
import { createDatabase } from "../storage/database.js"
import { cachedWikiGraph, clearWikiGraphMemoryCache } from "./graph-cache.js"

const author = { authorName: "Tester", authorEmail: "tester@example.com" }

describe("wiki graph cache", () => {
  beforeEach(() => {
    clearWikiGraphMemoryCache()
  })

  it("returns the same cached response while the branch tip is unchanged", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    const database = createDatabase({ path: ":memory:" })
    const wiki = createSkeletonWiki({ dataDir, branch: "main" })

    const first = cachedWikiGraph(database, wiki, "main")
    const second = cachedWikiGraph(database, wiki, "main")

    expect(first.nodes.map((node) => node.path)).toContain("overview.md")
    // tip이 같으면 메모리 캐시 히트 — 동일 참조를 반환한다.
    expect(second).toBe(first)
    database.close()
  })

  it("invalidates the cache when a new commit moves the branch tip", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    const database = createDatabase({ path: ":memory:" })
    const wiki = createSkeletonWiki({ dataDir, branch: "main" })

    const before = cachedWikiGraph(database, wiki, "main")
    expect(before.nodes.some((node) => node.path === "notes/added.md")).toBe(false)

    writeWikiFile(wiki, "notes/added.md", "# Added note\n\nIncremental content.\n")
    commitWiki(wiki, { ...author, message: "add note" })

    const after = cachedWikiGraph(database, wiki, "main")
    const added = after.nodes.find((node) => node.path === "notes/added.md")
    expect(added?.title).toBe("Added note")
    // 증분 경로에서도 기존 노드의 touch 메타는 유지된다.
    const overview = after.nodes.find((node) => node.path === "overview.md")
    expect(overview?.updated).toBeTruthy()
    database.close()
  })

  it("serves from the persistent cache after a process restart (memory cleared)", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    const database = createDatabase({ path: ":memory:" })
    const wiki = createSkeletonWiki({ dataDir, branch: "main" })

    const warm = cachedWikiGraph(database, wiki, "main")
    clearWikiGraphMemoryCache()

    const restored = cachedWikiGraph(database, wiki, "main")
    expect(restored).toEqual(warm)
    expect(restored).not.toBe(warm)
    database.close()
  })

  it("rebuilds when the persistent cache payload is corrupted", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    const database = createDatabase({ path: ":memory:" })
    const wiki = createSkeletonWiki({ dataDir, branch: "main" })
    const tip = wikiBranchTip(wiki)
    expect(tip).toMatch(/^[0-9a-f]{40,64}$/)

    database
      .prepare(
        "INSERT INTO wiki_graph_cache (branch, head, payload, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run("main", tip, "{not json", new Date().toISOString())

    const response = cachedWikiGraph(database, wiki, "main")
    expect(response.nodes.map((node) => node.path)).toContain("index.md")
    database.close()
  })

  it("reads the branch tip without spawning git", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    createDatabase({ path: ":memory:" }).close()
    const wiki = createSkeletonWiki({ dataDir, branch: "feature/nested" })

    const tip = wikiBranchTip(wiki)
    expect(tip).toMatch(/^[0-9a-f]{40,64}$/)

    writeWikiFile(wiki, "extra.md", "# Extra\n")
    const moved = commitWiki(wiki, { ...author, message: "extra" })
    expect(wikiBranchTip(wiki)).toBe(moved)
  })

  it("reuses the wiki repository handle for the same dataDir and branch", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "specraft-graph-cache-"))
    const first = createSkeletonWiki({ dataDir, branch: "main" })
    const second = createSkeletonWiki({ dataDir, branch: "main" })
    expect(second).toBe(first)

    const other = createSkeletonWiki({ dataDir, branch: "dev" })
    expect(other).not.toBe(first)
    expect(other.root).not.toBe(first.root)
  })
})
