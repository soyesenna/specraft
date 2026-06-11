import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { describe, expect, it } from "vitest"

import { loadSpecraftConfig } from "./config.js"
import { evaluateStopGate, readGitGateState } from "./gate.js"
import { createSpecraftMcpServer, MCP_SERVER_NAME, mcpServerVersion } from "./mcp.js"
import { markIngested, pendingReplaySessions, readSession, startSession } from "./session-state.js"
import {
  type SpecraftToolClient,
  specraftIngest,
  specraftQuery,
  specraftStatus,
  type ToolContext,
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
      safeMode: false,
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
      safeMode: false,
      strictMode: true,
      worktreeClean: true,
    })
    expect(fixture.remote).toContain("specraft-gate-remote-")
  })

})

function stubToolClient(overrides?: Partial<SpecraftToolClient>): SpecraftToolClient {
  return {
    query: async () => ({ answer: "query answer", citations: [], query_id: "qry_1" }),
    ingest: async () => ({ status: "accepted", wiki_commit: "wiki_1" }),
    status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    ...overrides,
  }
}

async function connectMcpClient(context: ToolContext): Promise<Client> {
  const server = createSpecraftMcpServer(context)
  const client = new Client({ name: "proxy-test-client", version: "0.0.0" })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

function testContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    client: stubToolClient(),
    home: mkdtempSync(join(tmpdir(), "specraft-mcp-home-")),
    sessionId: "s3",
    gitSnapshot: async () => ({ branch: "main", head: "abc" }),
    ...overrides,
  }
}

describe("mcp sdk server", () => {
  it("completes initialize with serverInfo and tools capability", async () => {
    const client = await connectMcpClient(testContext())
    const packageVersion = (
      JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
        version: string
      }
    ).version

    expect(client.getServerVersion()).toMatchObject({
      name: MCP_SERVER_NAME,
      version: packageVersion,
    })
    expect(mcpServerVersion()).toBe(packageVersion)
    expect(client.getServerCapabilities()?.tools).toBeDefined()
    await client.close()
  })

  it("lists the three tools with zod-derived inputSchema", async () => {
    const client = await connectMcpClient(testContext())
    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name)).toEqual([
      "specraft_query",
      "specraft_ingest",
      "specraft_status",
      "specraft_defer",
    ])
    const query = tools.find((tool) => tool.name === "specraft_query")
    expect(query?.inputSchema).toMatchObject({ type: "object" })
    expect(query?.inputSchema.properties).toMatchObject({ question: { type: "string" } })
    expect(query?.inputSchema.required).toContain("question")

    const ingest = tools.find((tool) => tool.name === "specraft_ingest")
    const ingestProperties = Object.keys(ingest?.inputSchema.properties ?? {})
    expect(ingestProperties).toEqual(
      expect.arrayContaining([
        "agent",
        "summary",
        "spec_changes",
        "progress_updates",
        "open_questions",
      ]),
    )
    expect(ingestProperties).not.toContain("branch")
    expect(ingestProperties).not.toContain("commit_hash")
    expect(ingestProperties).not.toContain("session_id")

    const status = tools.find((tool) => tool.name === "specraft_status")
    expect(status?.description).toBe("Read specraft server status and branch locks.")
    await client.close()
  })

  it("wraps tool call results in MCP content blocks and marks ingest sessions", async () => {
    const context = testContext()
    startSession({ home: context.home, sessionId: "s3", branch: "main", startedHead: "abc" })
    const client = await connectMcpClient(context)

    const queryResult = (await client.callTool({
      name: "specraft_query",
      arguments: { question: "what changed?" },
    })) as CallToolResult
    expect(queryResult.isError).toBeFalsy()
    expect(queryResult.content).toEqual([
      { type: "text", text: JSON.stringify({ answer: "query answer", citations: [], query_id: "qry_1" }) },
    ])
    expect(queryResult.structuredContent).toEqual({
      answer: "query answer",
      citations: [],
      query_id: "qry_1",
    })

    const ingestResult = (await client.callTool({
      name: "specraft_ingest",
      arguments: {
        agent: "codex",
        summary: "implemented proxy",
        spec_changes: [{ type: "added", area: "proxy", description: "mcp", reasoning: "M7" }],
        progress_updates: [],
        open_questions: [],
      },
    })) as CallToolResult
    expect(ingestResult.isError).toBeFalsy()
    expect(ingestResult.structuredContent).toEqual({ status: "accepted", wiki_commit: "wiki_1" })
    expect(readSession(context.home, "s3").ingested).toBe(true)

    const statusResult = (await client.callTool({
      name: "specraft_status",
      arguments: {},
    })) as CallToolResult
    expect(statusResult.structuredContent).toEqual({
      server: "ok",
      branch_locks: [],
      wiki_head_by_branch: {},
    })
    await client.close()
  })

  it("rejects tool calls that violate the declared inputSchema", async () => {
    const client = await connectMcpClient(testContext())

    const result = (await client.callTool({
      name: "specraft_query",
      arguments: {},
    })) as CallToolResult
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result.content)).toContain(
      "Invalid arguments for tool specraft_query",
    )
    await client.close()
  })

  it("converts the ingest HEAD push pre-check throw into an MCP tool error", async () => {
    let serverCalled = false
    const context = testContext({
      client: stubToolClient({
        ingest: async () => {
          serverCalled = true
          return { status: "accepted", wiki_commit: "wiki_1" }
        },
      }),
      headPushed: async () => false,
    })
    const client = await connectMcpClient(context)

    const result = (await client.callTool({
      name: "specraft_ingest",
      arguments: {
        agent: "codex",
        summary: "should not call server",
        spec_changes: [{ type: "added", area: "mcp", description: "blocked", reasoning: "P2" }],
        progress_updates: [],
        open_questions: [],
      },
    })) as CallToolResult
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([
      { type: "text", text: "HEAD is not pushed; push before specraft_ingest" },
    ])
    expect(serverCalled).toBe(false)
    await client.close()
  })
})
