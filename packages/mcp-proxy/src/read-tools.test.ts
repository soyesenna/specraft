// M2.1·M2.2 — read 도구 5종(read_page/tree/history/conflicts/context)의
// mock client 호출·git 바인딩 검증 + MCP resources/prompts 노출 검증.
// 스타일은 proxy.test.ts의 InMemoryTransport 패턴을 따른다.
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { describe, expect, it } from "vitest"

import { createSpecraftMcpServer, wikiResourceUri } from "./mcp.js"
import type { SpecraftToolClient, ToolContext } from "./tools.js"

function stubToolClient(overrides?: Partial<SpecraftToolClient>): SpecraftToolClient {
  return {
    query: async () => ({ answer: "query answer", citations: [], query_id: "qry_1" }),
    ingest: async () => ({ status: "accepted", wiki_commit: "wiki_1" }),
    status: async () => ({ server: "ok", branch_locks: [], wiki_head_by_branch: {} }),
    context: async () => ({
      branch_status: { state: "ready" },
      index: "# Index",
      overview: "# Overview",
      wiki_head: "wiki_head_1",
    }),
    wikiPage: async (request) => ({
      branch: request.branch,
      content: "# Page\n\nbody\n",
      path: request.path,
    }),
    wikiTree: async (request) => ({ branch: request.branch, entries: [] }),
    wikiHistory: async (request) => ({ branch: request.branch, path: request.path, versions: [] }),
    listConflicts: async () => ({ conflicts: [] }),
    ...overrides,
  }
}

function testContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    client: stubToolClient(),
    home: mkdtempSync(join(tmpdir(), "specraft-read-tools-home-")),
    sessionId: "s-read",
    gitSnapshot: async () => ({ branch: "feature/login", head: "head_1" }),
    ...overrides,
  }
}

async function connectMcpClient(context: ToolContext): Promise<Client> {
  const server = createSpecraftMcpServer(context)
  const client = new Client({ name: "read-tools-test-client", version: "0.0.0" })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

describe("read tools (M2.1)", () => {
  it("specraft_read_page binds the git branch and forwards the path", async () => {
    const requests: Array<{ branch: string; path: string }> = []
    const context = testContext({
      client: stubToolClient({
        wikiPage: async (request) => {
          requests.push(request)
          return { branch: request.branch, content: "# Login\n", path: request.path }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const result = (await client.callTool({
      name: "specraft_read_page",
      arguments: { path: "changes/abc.md" },
    })) as CallToolResult
    expect(result.isError).toBeFalsy()
    expect(requests).toEqual([{ branch: "feature/login", path: "changes/abc.md" }])
    expect(result.structuredContent).toEqual({
      branch: "feature/login",
      content: "# Login\n",
      path: "changes/abc.md",
    })
    await client.close()
  })

  it("specraft_read_page rejects calls without a path", async () => {
    const client = await connectMcpClient(testContext())
    const result = (await client.callTool({
      name: "specraft_read_page",
      arguments: {},
    })) as CallToolResult
    expect(result.isError).toBe(true)
    await client.close()
  })

  it("specraft_tree binds the git branch", async () => {
    const branches: string[] = []
    const context = testContext({
      client: stubToolClient({
        wikiTree: async (request) => {
          branches.push(request.branch)
          return {
            branch: request.branch,
            entries: [
              { path: "overview.md", type: "file" },
              { path: "changes", type: "dir" },
            ],
          }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const result = (await client.callTool({
      name: "specraft_tree",
      arguments: {},
    })) as CallToolResult
    expect(branches).toEqual(["feature/login"])
    expect(result.structuredContent).toEqual({
      branch: "feature/login",
      entries: [
        { path: "overview.md", type: "file" },
        { path: "changes", type: "dir" },
      ],
    })
    await client.close()
  })

  it("specraft_history binds branch+path and truncates with limit proxy-side", async () => {
    const requests: Array<{ branch: string; path: string }> = []
    const versions = [1, 2, 3].map((index) => ({
      added: [],
      added_lines: index,
      author: "tester",
      commit_hash: `c${index}`,
      removed: [],
      removed_lines: 0,
      summary: `change ${index}`,
      timestamp: `2026-06-1${index}T00:00:00Z`,
    }))
    const context = testContext({
      client: stubToolClient({
        wikiHistory: async (request) => {
          requests.push(request)
          return { branch: request.branch, path: request.path, versions }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const unlimited = (await client.callTool({
      name: "specraft_history",
      arguments: { path: "overview.md" },
    })) as CallToolResult
    expect(requests).toEqual([{ branch: "feature/login", path: "overview.md" }])
    expect((unlimited.structuredContent as { versions: unknown[] }).versions).toHaveLength(3)

    const limited = (await client.callTool({
      name: "specraft_history",
      arguments: { path: "overview.md", limit: 2 },
    })) as CallToolResult
    const limitedVersions = (
      limited.structuredContent as { versions: Array<{ commit_hash: string }> }
    ).versions
    expect(limitedVersions.map((version) => version.commit_hash)).toEqual(["c1", "c2"])
    await client.close()
  })

  it("specraft_conflicts returns the server conflict list", async () => {
    const context = testContext({
      client: stubToolClient({
        listConflicts: async () => ({
          conflicts: [{ branch: "main", detail: "diverged", id: "cfl_1", state: "open" }],
        }),
      }),
    })
    const client = await connectMcpClient(context)

    const result = (await client.callTool({
      name: "specraft_conflicts",
      arguments: {},
    })) as CallToolResult
    expect(result.structuredContent).toEqual({
      conflicts: [{ branch: "main", detail: "diverged", id: "cfl_1", state: "open" }],
    })
    await client.close()
  })

  it("specraft_context binds branch and HEAD for manual rehydration", async () => {
    const requests: Array<{ branch: string; commit_hash: string }> = []
    const context = testContext({
      client: stubToolClient({
        context: async (request) => {
          requests.push(request)
          return {
            branch_status: { state: "ready" },
            index: "# Index",
            overview: "# Overview",
            wiki_head: "wiki_head_1",
          }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const result = (await client.callTool({
      name: "specraft_context",
      arguments: {},
    })) as CallToolResult
    expect(requests).toEqual([{ branch: "feature/login", commit_hash: "head_1" }])
    expect(result.structuredContent).toMatchObject({ overview: "# Overview", index: "# Index" })
    await client.close()
  })

  it("specraft_context forwards budget_tokens and omits the key when unspecified (M3.6)", async () => {
    const requests: Array<{ branch: string; commit_hash: string; budget_tokens?: number }> = []
    const context = testContext({
      client: stubToolClient({
        context: async (request) => {
          requests.push(request)
          return {
            branch_status: { state: "ready" },
            index: "# Index",
            overview: "...[truncated 12 tokens]",
            truncated: true,
            wiki_head: "wiki_head_1",
          }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const budgeted = (await client.callTool({
      name: "specraft_context",
      arguments: { budget_tokens: 64 },
    })) as CallToolResult
    expect(budgeted.isError).toBeFalsy()
    expect(requests).toEqual([
      { branch: "feature/login", budget_tokens: 64, commit_hash: "head_1" },
    ])
    expect(budgeted.structuredContent).toMatchObject({ truncated: true })

    await client.callTool({ name: "specraft_context", arguments: {} })
    expect(requests).toHaveLength(2)
    expect(Object.keys(requests[1] ?? {})).not.toContain("budget_tokens")
    await client.close()
  })

  it("specraft_context rejects non-positive budget_tokens via the inputSchema", async () => {
    const client = await connectMcpClient(testContext())
    const result = (await client.callTool({
      name: "specraft_context",
      arguments: { budget_tokens: 0 },
    })) as CallToolResult
    expect(result.isError).toBe(true)
    await client.close()
  })
})

describe("wiki resources (M2.2)", () => {
  it("lists wiki pages from the tree with branch-encoded uris", async () => {
    const context = testContext({
      client: stubToolClient({
        wikiTree: async (request) => ({
          branch: request.branch,
          entries: [
            { path: "overview.md", type: "file" },
            { path: "changes", type: "dir" },
            { path: "changes/abc.md", type: "file" },
          ],
        }),
      }),
    })
    const client = await connectMcpClient(context)

    const { resources } = await client.listResources()
    expect(resources.map((resource) => resource.uri)).toEqual([
      "specraft://wiki/feature%2Flogin/overview.md",
      "specraft://wiki/feature%2Flogin/changes/abc.md",
    ])
    expect(resources.every((resource) => resource.mimeType === "text/markdown")).toBe(true)
    await client.close()
  })

  it("returns an empty resource list instead of an error when the server is unavailable", async () => {
    const context = testContext({
      client: stubToolClient({
        wikiTree: async () => {
          throw new Error("specraft server unreachable")
        },
      }),
    })
    const client = await connectMcpClient(context)

    const { resources } = await client.listResources()
    expect(resources).toEqual([])
    await client.close()
  })

  it("reads a wiki page resource with decoded branch and multi-segment path", async () => {
    const requests: Array<{ branch: string; path: string }> = []
    const context = testContext({
      client: stubToolClient({
        wikiPage: async (request) => {
          requests.push(request)
          return { branch: request.branch, content: "# Cited page\n", path: request.path }
        },
      }),
    })
    const client = await connectMcpClient(context)

    const uri = wikiResourceUri("feature/login", "changes/abc.md")
    expect(uri).toBe("specraft://wiki/feature%2Flogin/changes/abc.md")
    const result = await client.readResource({ uri })
    expect(requests).toEqual([{ branch: "feature/login", path: "changes/abc.md" }])
    expect(result.contents).toEqual([{ mimeType: "text/markdown", text: "# Cited page\n", uri }])
    await client.close()
  })
})

describe("prompts (M2.2)", () => {
  it("lists the specraft-review prompt", async () => {
    const client = await connectMcpClient(testContext())
    const { prompts } = await client.listPrompts()
    expect(prompts.map((prompt) => prompt.name)).toContain("specraft-review")
    await client.close()
  })

  it("renders the review prompt with citation follow-up instructions", async () => {
    const client = await connectMcpClient(testContext())
    const result = await client.getPrompt({
      name: "specraft-review",
      arguments: { focus: "auth" },
    })
    const text = result.messages
      .map((message) => (message.content.type === "text" ? message.content.text : ""))
      .join("\n")
    expect(text).toContain("specraft_query")
    expect(text).toContain("specraft_read_page")
    expect(text).toContain("focus: auth")
    await client.close()
  })
})
