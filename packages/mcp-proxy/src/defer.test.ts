import { execFileSync } from "node:child_process"
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { describe, expect, it } from "vitest"

import { consumeDefer, defersDir, recordDefer } from "./defer-state.js"
import { decideStop, readGitGateState } from "./gate.js"
import { readRepoRoot } from "./git.js"
import { createSpecraftMcpServer } from "./mcp.js"
import { startSession } from "./session-state.js"
import type { SpecraftToolClient, ToolContext } from "./tools.js"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createGitRepo(): {
  readonly remote: string
  readonly repo: string
  readonly first: string
} {
  const repo = mkdtempSync(join(tmpdir(), "specraft-defer-repo-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const first = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-defer-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "-u", "origin", "main"])
  return { remote, repo, first }
}

function makeHome(): string {
  return mkdtempSync(join(tmpdir(), "specraft-defer-home-"))
}

function readSingleMarker(home: string): Record<string, unknown> {
  const files = readdirSync(defersDir(home))
  expect(files).toHaveLength(1)
  const name = files[0]
  if (!name) {
    throw new Error("defer marker missing")
  }
  return JSON.parse(readFileSync(join(defersDir(home), name), "utf8")) as Record<string, unknown>
}

describe("specraft_defer stop-gate escape", () => {
  it("allows exactly one stop after a defer and re-blocks once consumed", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "draft\n")
    const stopInput = { cwd: fixture.repo, home, sessionId: "s-defer", strictMode: true }

    expect(decideStop(stopInput).decision).toBe("block")

    recordDefer(
      home,
      { branch: "main", head: fixture.first, repoPath: readRepoRoot(fixture.repo) },
      "backend outage",
    )
    expect(decideStop(stopInput)).toEqual({
      decision: "allow",
      deferred: true,
      reason: "deferred: backend outage",
    })
    expect(readSingleMarker(home)["consumed"]).toBe(true)

    const reStop = decideStop(stopInput)
    expect(reStop.decision).toBe("block")
    expect(reStop.reason).toContain("specraft_defer")
  })

  it("lets a different session consume the marker (cross-session, session-independent key)", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "draft\n")
    recordDefer(
      home,
      { branch: "main", head: fixture.first, repoPath: readRepoRoot(fixture.repo) },
      "recorded by another process",
    )

    const decision = decideStop({ cwd: fixture.repo, home, sessionId: null, strictMode: true })
    expect(decision).toEqual({
      decision: "allow",
      deferred: true,
      reason: "deferred: recorded by another process",
    })
  })

  it("ignores and deletes stale markers whose HEAD does not match", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "draft\n")
    recordDefer(
      home,
      { branch: "main", head: "0".repeat(40), repoPath: readRepoRoot(fixture.repo) },
      "stale reason",
    )

    expect(
      decideStop({ cwd: fixture.repo, home, sessionId: "s-stale", strictMode: true }).decision,
    ).toBe("block")
    expect(readdirSync(defersDir(home))).toHaveLength(0)
  })

  it("does not consume markers belonging to a different repo", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "draft\n")
    recordDefer(
      home,
      { branch: "main", head: fixture.first, repoPath: "/other/repo" },
      "other repo",
    )

    expect(
      decideStop({ cwd: fixture.repo, home, sessionId: "s-other", strictMode: true }).decision,
    ).toBe("block")
    expect(
      consumeDefer(home, { branch: "main", head: fixture.first, repoPath: "/other/repo" }),
    ).not.toBeNull()
  })
})

describe("safe mode (no session id)", () => {
  it("marks safeMode in gate state and skips the ingest check on clean+pushed repos", () => {
    const fixture = createGitRepo()
    const home = makeHome()

    expect(
      readGitGateState({ cwd: fixture.repo, home, sessionId: null, strictMode: true }).safeMode,
    ).toBe(true)

    const withSessionId = decideStop({
      cwd: fixture.repo,
      home,
      sessionId: "s-no-marker",
      strictMode: true,
    })
    expect(withSessionId.decision).toBe("block")
    expect(withSessionId.reason).toContain("ingest marker")

    const safeMode = decideStop({ cwd: fixture.repo, home, sessionId: null, strictMode: true })
    expect(safeMode.decision).toBe("allow")
    expect(safeMode.reason).toContain("safe mode")
  })

  it("still blocks dirty worktrees in safe mode", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    writeFileSync(join(fixture.repo, "WIP.md"), "draft\n")

    const decision = decideStop({ cwd: fixture.repo, home, sessionId: null, strictMode: true })
    expect(decision.decision).toBe("block")
    expect(decision.reason).toContain("dirty")
  })

  it("keeps the session-bound ingest check for tracked sessions", () => {
    const fixture = createGitRepo()
    const home = makeHome()
    startSession({ home, sessionId: "s-tracked", branch: "main", startedHead: fixture.first })

    expect(
      decideStop({ cwd: fixture.repo, home, sessionId: "s-tracked", strictMode: true }),
    ).toEqual({ decision: "allow", reason: "read-only session exemption" })
  })
})

describe("specraft_defer MCP tool", () => {
  it("records a defer marker offline without calling the specraft server", async () => {
    const fixture = createGitRepo()
    const home = makeHome()
    let serverCalled = false
    const client: SpecraftToolClient = {
      query: async () => {
        serverCalled = true
        return { answer: "", citations: [], query_id: "qry" }
      },
      ingest: async () => {
        serverCalled = true
        return { status: "accepted", wiki_commit: "abc" }
      },
      status: async () => {
        serverCalled = true
        return { server: "ok", branch_locks: [], wiki_head_by_branch: {} }
      },
    }
    const context: ToolContext = {
      client,
      home,
      sessionId: null,
      gitSnapshot: async () => ({ branch: "main", head: fixture.first }),
      repoRoot: () => readRepoRoot(fixture.repo),
    }
    const server = createSpecraftMcpServer(context)
    const mcpClient = new Client({ name: "defer-test-client", version: "0.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), mcpClient.connect(clientTransport)])

    const result = (await mcpClient.callTool({
      name: "specraft_defer",
      arguments: { reason: "demo deadline" },
    })) as CallToolResult
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({
      status: "deferred",
      branch: "main",
      head: fixture.first,
      reason: "demo deadline",
    })
    expect(serverCalled).toBe(false)
    expect(readSingleMarker(home)["consumed"]).toBe(false)

    const rejected = (await mcpClient.callTool({
      name: "specraft_defer",
      arguments: { reason: "" },
    })) as CallToolResult
    expect(rejected.isError).toBe(true)
    await mcpClient.close()
  })
})
