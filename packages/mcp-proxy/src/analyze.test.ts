// M4+ — specraft_analyze 단위 테스트: 변경 파일 수집(주입/명시 paths), 연관 페이지
// 토큰 매칭, 발췌 절단, open question 추출, MCP 도구 노출(mock client).
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { describe, expect, it } from "vitest"

import {
  EXCERPT_MAX_CHARS,
  excerptContent,
  extractOpenQuestions,
  rankRelatedPages,
  specraftAnalyze,
} from "./analyze.js"
import { createSpecraftMcpServer } from "./mcp.js"
import type { SpecraftToolClient, ToolContext } from "./tools.js"

function stubToolClient(overrides?: Partial<SpecraftToolClient>): SpecraftToolClient {
  return {
    query: async () => ({ answer: "answer", citations: [], query_id: "qry_1" }),
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
    home: mkdtempSync(join(tmpdir(), "specraft-analyze-home-")),
    sessionId: "s-analyze",
    gitSnapshot: async () => ({ branch: "feature/login", head: "head_1" }),
    changedFiles: () => [],
    ...overrides,
  }
}

describe("rankRelatedPages", () => {
  it("ranks pages by token overlap with changed files and drops non-matches", () => {
    const ranked = rankRelatedPages(
      ["changes/login-flow.md", "changes/billing.md", "overview.md", "auth/login.md"],
      ["src/auth/login-form.ts"],
    )
    expect(ranked[0]).toBe("auth/login.md")
    expect(ranked).toContain("changes/login-flow.md")
    expect(ranked).not.toContain("changes/billing.md")
    expect(ranked).not.toContain("overview.md")
  })

  it("ignores short tokens and path stopwords", () => {
    expect(rankRelatedPages(["changes/ui.md"], ["src/ui.ts"])).toEqual([])
    expect(rankRelatedPages(["src.md", "tests.md"], ["src/tests/db.ts"])).toEqual([])
  })
})

describe("extractOpenQuestions", () => {
  it("collects bullets under Open Questions headings and stops at the next heading", () => {
    const content = [
      "# Ingest s1",
      "## Open Questions",
      "- Who owns the auth module?",
      "* Is the cache size bounded?",
      "## Spec Changes",
      "- added auth: something",
    ].join("\n")
    expect(extractOpenQuestions(content)).toEqual([
      "Who owns the auth module?",
      "Is the cache size bounded?",
    ])
  })

  it("drops the '- none' placeholder and handles pages without the section", () => {
    expect(extractOpenQuestions("## Open Questions\n- none\n")).toEqual([])
    expect(extractOpenQuestions("# Page\n\nbody\n")).toEqual([])
  })
})

describe("excerptContent", () => {
  it("truncates long content with a marker and keeps short content intact", () => {
    expect(excerptContent("short")).toBe("short")
    const long = "x".repeat(EXCERPT_MAX_CHARS + 100)
    const excerpt = excerptContent(long)
    expect(excerpt).toContain("…[truncated]")
    expect(excerpt.length).toBeLessThan(long.length)
  })
})

describe("specraftAnalyze", () => {
  it("collects injected git changes, related page excerpts, and open questions", async () => {
    const pageRequests: string[] = []
    const context = testContext({
      changedFiles: () => ["src/auth/login-form.ts", "src/auth/session.ts"],
      client: stubToolClient({
        wikiTree: async (request) => ({
          branch: request.branch,
          entries: [
            { path: "auth/login.md", type: "file" },
            { path: "changes/billing.md", type: "file" },
            { path: "auth", type: "dir" },
          ],
        }),
        wikiPage: async (request) => {
          pageRequests.push(request.path)
          return {
            branch: request.branch,
            content: "# Login spec\n\n## Open Questions\n- Should sessions expire?\n",
            path: request.path,
          }
        },
      }),
    })
    const result = await specraftAnalyze(context)
    expect(result.changed_files).toEqual(["src/auth/login-form.ts", "src/auth/session.ts"])
    expect(pageRequests).toEqual(["auth/login.md"])
    expect(result.related_pages).toEqual([
      {
        content_excerpt: "# Login spec\n\n## Open Questions\n- Should sessions expire?\n",
        path: "auth/login.md",
      },
    ])
    expect(result.open_questions).toEqual(["Should sessions expire?"])
  })

  it("prefers explicit paths over git collection and dedupes them", async () => {
    const context = testContext({
      changedFiles: () => {
        throw new Error("must not collect from git when paths are given")
      },
    })
    const result = await specraftAnalyze(context, {
      paths: ["src/billing.ts", "src/billing.ts"],
    })
    expect(result.changed_files).toEqual(["src/billing.ts"])
  })

  it("returns an empty report without touching the wiki when nothing changed", async () => {
    const context = testContext({
      changedFiles: () => [],
      client: stubToolClient({
        wikiTree: async () => {
          throw new Error("wiki must not be queried for an empty diff")
        },
      }),
    })
    const result = await specraftAnalyze(context)
    expect(result).toEqual({
      branch: "feature/login",
      changed_files: [],
      open_questions: [],
      related_pages: [],
    })
  })

  it("is exposed as the specraft_analyze MCP tool", async () => {
    const context = testContext({
      changedFiles: () => ["src/auth/login.ts"],
      client: stubToolClient({
        wikiTree: async (request) => ({
          branch: request.branch,
          entries: [{ path: "auth/login.md", type: "file" }],
        }),
      }),
    })
    const server = createSpecraftMcpServer(context)
    const client = new Client({ name: "analyze-test-client", version: "0.0.0" })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { tools } = await client.listTools()
    const analyzeTool = tools.find((tool) => tool.name === "specraft_analyze")
    expect(analyzeTool?.description).toContain("drift")
    const result = (await client.callTool({
      name: "specraft_analyze",
      arguments: {},
    })) as CallToolResult
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toMatchObject({
      changed_files: ["src/auth/login.ts"],
      related_pages: [{ path: "auth/login.md", content_excerpt: "# Page\n\nbody\n" }],
    })
    await client.close()
  })
})
