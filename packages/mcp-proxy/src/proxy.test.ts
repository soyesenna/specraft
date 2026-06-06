import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { loadSpecraftConfig } from "./config.js"
import { evaluateStopGate } from "./gate.js"
import { handleMcpRequest } from "./mcp.js"
import { pendingReplaySessions, readSession, startSession } from "./session-state.js"
import { type SpecraftToolClient, specraftIngest, specraftQuery, specraftStatus } from "./tools.js"

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
    startSession({ home, sessionId: "s1", branch: "main" })
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

  it("responds to JSON-RPC tool list and call requests", async () => {
    const tool = {
      name: "specraft_status",
      description: "status",
      call: async () => ({ server: "ok" }),
    }
    expect(await handleMcpRequest([tool], { jsonrpc: "2.0", id: 1, method: "tools/list" })).toEqual(
      {
        jsonrpc: "2.0",
        id: 1,
        result: { tools: [{ name: "specraft_status", description: "status" }] },
      },
    )
    expect(
      await handleMcpRequest([tool], {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "specraft_status" },
      }),
    ).toEqual({ jsonrpc: "2.0", id: 2, result: { server: "ok" } })
  })
})
