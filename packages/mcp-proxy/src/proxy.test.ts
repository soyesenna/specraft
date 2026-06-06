import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { loadSpecraftConfig } from "./config.js"
import { evaluateStopGate, readGitGateState } from "./gate.js"
import { handleMcpRequest } from "./mcp.js"
import { markIngested, pendingReplaySessions, readSession, startSession } from "./session-state.js"
import {
  createMcpTools,
  type SpecraftToolClient,
  specraftIngest,
  specraftQuery,
  specraftStatus,
} from "./tools.js"

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim()
}

function createGitRepo(): {
  readonly remote: string
  readonly repo: string
  readonly first: string
} {
  const repo = mkdtempSync(join(tmpdir(), "specraft-gate-repo-"))
  git(repo, ["init", "-b", "main"])
  git(repo, ["config", "user.email", "test@example.com"])
  git(repo, ["config", "user.name", "Test User"])
  writeFileSync(join(repo, "README.md"), "# App\n")
  git(repo, ["add", "README.md"])
  git(repo, ["commit", "-m", "initial"])
  const first = git(repo, ["rev-parse", "HEAD"])
  const remote = mkdtempSync(join(tmpdir(), "specraft-gate-remote-"))
  git(remote, ["init", "--bare"])
  git(repo, ["remote", "add", "origin", remote])
  git(repo, ["push", "-u", "origin", "main"])
  return { remote, repo, first }
}

describe("mcp proxy core", () => {
  it("loads project config with strict mode default", () => {
    const cwd = mkdtempSync(join(tmpdir(), "specraft-config-"))
    writeFileSync(join(cwd, ".specraft.json"), '{"server_url":"http://127.0.0.1:4311"}')
    expect(loadSpecraftConfig(cwd)).toEqual({
      server_url: "http://127.0.0.1:4311",
      strict_mode: true,
    })
  })

  it("evaluates the stop gate matrix including read-only and dirty sessions", () => {
    expect(
      evaluateStopGate({
        strictMode: true,
        worktreeClean: true,
        hasNewCommits: false,
        headPushed: false,
        ingested: false,
      }),
    ).toEqual({ decision: "allow", reason: "read-only session exemption" })
    expect(
      evaluateStopGate({
        strictMode: true,
        worktreeClean: false,
        hasNewCommits: false,
        headPushed: false,
        ingested: false,
      }).decision,
    ).toBe("block")
    expect(
      evaluateStopGate({
        strictMode: true,
        worktreeClean: true,
        hasNewCommits: true,
        headPushed: true,
        ingested: true,
      }).decision,
    ).toBe("allow")
  })

  it("tracks pending replay markers and marks ingest success", async () => {
    const home = mkdtempSync(join(tmpdir(), "specraft-session-"))
    startSession({ home, sessionId: "s1", branch: "main", startedHead: "base" })
    expect(pendingReplaySessions(home)).toHaveLength(1)
    const client: SpecraftToolClient = {
      query: async () => ({ answer: "ok", citations: [], query_id: "qry_1" }),
      ingest: async () => ({ status: "accepted", wiki_commit: "abc" }),
      status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    }
    const context = {
      client,
      home,
      sessionId: "s1",
      gitSnapshot: async () => ({ branch: "main", head: "abc" }),
    }
    expect(await specraftQuery(context, { question: "what changed?" })).toEqual({
      answer: "ok",
      citations: [],
      query_id: "qry_1",
    })
    expect(
      await specraftIngest(context, {
        agent: "codex",
        summary: "implemented proxy",
        spec_changes: [{ type: "added", area: "proxy", description: "mcp", reasoning: "M7" }],
        progress_updates: [],
        open_questions: [],
      }),
    ).toEqual({ status: "accepted", wiki_commit: "abc" })
    expect(readSession(home, "s1").ingested).toBe(true)
    expect(await specraftStatus(context)).toEqual({
      server: "ok",
      branch_locks: [],
      wiki_head_by_branch: {},
    })
  })

  it("excludes the current session from pending replay prompts", () => {
    const home = mkdtempSync(join(tmpdir(), "specraft-session-current-"))
    startSession({ home, sessionId: "current", branch: "main", startedHead: "abc" })
    startSession({ home, sessionId: "previous", branch: "main", startedHead: "def" })

    expect(
      pendingReplaySessions(home, { excludeSessionId: "current" }).map(
        (marker) => marker.session_id,
      ),
    ).toEqual(["previous"])
  })

  it("blocks specraft_ingest locally when HEAD is not pushed", async () => {
    let called = false
    const client: SpecraftToolClient = {
      query: async () => ({ answer: "ok", citations: [], query_id: "qry_1" }),
      ingest: async () => {
        called = true
        return { status: "accepted", wiki_commit: "abc" }
      },
      status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    }
    const context = {
      client,
      home: mkdtempSync(join(tmpdir(), "specraft-unpushed-home-")),
      sessionId: "s-unpushed",
      gitSnapshot: async () => ({ branch: "main", head: "abc" }),
      headPushed: async () => false,
    }

    await expect(
      specraftIngest(context, {
        agent: "codex",
        summary: "should not call server",
        spec_changes: [{ type: "added", area: "mcp", description: "blocked", reasoning: "P2" }],
        progress_updates: [],
        open_questions: [],
      }),
    ).rejects.toThrow("HEAD is not pushed")
    expect(called).toBe(false)
  })

  it("derives stop-gate state from git and session ingest markers", () => {
    const fixture = createGitRepo()
    const home = mkdtempSync(join(tmpdir(), "specraft-gate-home-"))
    startSession({ home, sessionId: "s2", branch: "main", startedHead: fixture.first })

    expect(
      readGitGateState({ cwd: fixture.repo, home, sessionId: "s2", strictMode: true }),
    ).toEqual({
      hasNewCommits: false,
      headPushed: true,
      ingested: false,
      strictMode: true,
      worktreeClean: true,
    })

    writeFileSync(join(fixture.repo, "README.md"), "# App\n\nchanged\n")
    git(fixture.repo, ["commit", "-am", "second"])
    expect(
      readGitGateState({ cwd: fixture.repo, home, sessionId: "s2", strictMode: true }).headPushed,
    ).toBe(false)
    git(fixture.repo, ["push"])
    expect(
      readGitGateState({ cwd: fixture.repo, home, sessionId: "s2", strictMode: true }).ingested,
    ).toBe(false)
    markIngested(home, "s2")
    expect(
      readGitGateState({ cwd: fixture.repo, home, sessionId: "s2", strictMode: true }),
    ).toEqual({
      hasNewCommits: true,
      headPushed: true,
      ingested: true,
      strictMode: true,
      worktreeClean: true,
    })
    expect(fixture.remote).toContain("specraft-gate-remote-")
  })

  it("responds to JSON-RPC tool list and call requests", async () => {
    const client: SpecraftToolClient = {
      query: async () => ({ answer: "query answer", citations: [], query_id: "qry_1" }),
      ingest: async () => ({ status: "accepted", wiki_commit: "wiki_1" }),
      status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    }
    const home = mkdtempSync(join(tmpdir(), "specraft-mcp-home-"))
    startSession({ home, sessionId: "s3", branch: "main", startedHead: "abc" })
    const tools = createMcpTools({
      client,
      home,
      sessionId: "s3",
      gitSnapshot: async () => ({ branch: "main", head: "abc" }),
    })

    expect(await handleMcpRequest(tools, { jsonrpc: "2.0", id: 1, method: "tools/list" })).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        tools: [
          { name: "specraft_query", description: "Ask the specraft wiki a branch-aware question." },
          { name: "specraft_ingest", description: "Ingest completed work into the specraft wiki." },
          { name: "specraft_status", description: "Read specraft server status and branch locks." },
        ],
      },
    })
    expect(
      await handleMcpRequest(tools, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "specraft_query", arguments: { question: "what changed?" } },
      }),
    ).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: { answer: "query answer", citations: [], query_id: "qry_1" },
    })
    expect(
      await handleMcpRequest(tools, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "specraft_ingest",
          arguments: {
            agent: "codex",
            summary: "implemented proxy",
            spec_changes: [{ type: "added", area: "proxy", description: "mcp", reasoning: "M7" }],
            progress_updates: [],
            open_questions: [],
          },
        },
      }),
    ).toEqual({ jsonrpc: "2.0", id: 3, result: { status: "accepted", wiki_commit: "wiki_1" } })
    expect(readSession(home, "s3").ingested).toBe(true)
  })
})
