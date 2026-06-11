import { readFileSync } from "node:fs"

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"

import { AnalyzeToolInputSchema, specraftAnalyze } from "./analyze.js"
import {
  ContextToolInputSchema,
  DeferToolInputSchema,
  HistoryToolInputSchema,
  IngestToolInputSchema,
  QueryToolInputSchema,
  ReadPageToolInputSchema,
  SearchToolInputSchema,
  specraftConflicts,
  specraftContext,
  specraftDefer,
  specraftHistory,
  specraftIngest,
  specraftQuery,
  specraftReadPage,
  specraftSearch,
  specraftStatus,
  specraftTree,
  type ToolContext,
} from "./tools.js"

export const MCP_SERVER_NAME = "specraft"

/** 위키 페이지 resource URI 템플릿 — branch는 encodeURIComponent로 단일 세그먼트화한다. */
export const WIKI_RESOURCE_URI_TEMPLATE = "specraft://wiki/{branch}/{+path}"

export function wikiResourceUri(branch: string, path: string): string {
  return `specraft://wiki/${encodeURIComponent(branch)}/${path}`
}

const PackageManifestSchema = z.object({ version: z.string().min(1) })

/** Inlined at bundle time by the tsup `define` option (see tsup.config.ts). */
declare const __SPECRAFT_PROXY_VERSION__: string | undefined

export function mcpServerVersion(): string {
  // Single-file bundles cannot resolve ../package.json relative to import.meta.url,
  // so the bundle carries the version as a build-time constant instead.
  if (typeof __SPECRAFT_PROXY_VERSION__ === "string" && __SPECRAFT_PROXY_VERSION__ !== "") {
    return __SPECRAFT_PROXY_VERSION__
  }
  try {
    const manifest = PackageManifestSchema.parse(
      JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")),
    )
    return manifest.version
  } catch {
    return "0.0.0"
  }
}

function toToolResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload as Record<string, unknown>,
  }
}

export function createSpecraftMcpServer(context: ToolContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: mcpServerVersion() })
  server.registerTool(
    "specraft_query",
    {
      description: "Ask the specraft wiki a branch-aware question.",
      inputSchema: QueryToolInputSchema.shape,
    },
    async (input) => toToolResult(await specraftQuery(context, QueryToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_ingest",
    {
      description: "Ingest completed work into the specraft wiki.",
      inputSchema: IngestToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftIngest(context, IngestToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_status",
    { description: "Read specraft server status and branch locks." },
    async () => toToolResult(await specraftStatus(context)),
  )
  server.registerTool(
    "specraft_defer",
    {
      description:
        "Record a stop-gate defer marker for the current repo+branch+HEAD: the reason is logged and exactly one stop is allowed (consume-on-use). Works offline without the specraft server.",
      inputSchema: DeferToolInputSchema.shape,
    },
    async (input) => toToolResult(await specraftDefer(context, DeferToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_read_page",
    {
      description:
        "Read the full markdown text of one spec wiki page on the current git branch. Use this to follow specraft_query citations back to their source: pass a citations[].path value (e.g. 'changes/abc.md') as path to retrieve the cited page in full.",
      inputSchema: ReadPageToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftReadPage(context, ReadPageToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_tree",
    {
      description:
        "List all spec wiki page paths for the current git branch. Use this to discover which spec pages exist before calling specraft_read_page or to orient yourself in an unfamiliar wiki.",
    },
    async () => toToolResult(await specraftTree(context)),
  )
  server.registerTool(
    "specraft_history",
    {
      description:
        "Read the change history of one spec wiki page on the current git branch (commits, authors, added/removed lines). Use this to understand how a spec decision evolved over time; optional limit returns only the newest N versions.",
      inputSchema: HistoryToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftHistory(context, HistoryToolInputSchema.parse(input))),
  )
  server.registerTool(
    "specraft_conflicts",
    {
      description:
        "List open spec conflicts (branch locks) on the specraft server. Use this when specraft_ingest was rejected with branch_locked, or before merging branches, to see which conflicts must be resolved first.",
    },
    async () => toToolResult(await specraftConflicts(context)),
  )
  server.registerTool(
    "specraft_context",
    {
      description:
        "Re-fetch the specraft session context (wiki overview + index) bound to the current branch and HEAD. Use this to rehydrate spec context when hook-based injection is unavailable on this host or the injected context was compacted away. Optional budget_tokens caps the response size (index is preserved first; truncated=true marks a cut overview).",
      inputSchema: ContextToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftContext(context, ContextToolInputSchema.parse(input ?? {}))),
  )
  server.registerTool(
    "specraft_analyze",
    {
      description:
        "Collect spec-drift review material for the pending git changes: changed files (worktree+staged vs HEAD, or explicit paths), related spec wiki pages with excerpts, and open questions from those pages. Workflow: call this after editing, compare each related_pages excerpt with the actual diff, judge drift yourself (the tool only gathers material), then record deviations via specraft_ingest or answer open_questions.",
      inputSchema: AnalyzeToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftAnalyze(context, AnalyzeToolInputSchema.parse(input ?? {}))),
  )
  server.registerTool(
    "specraft_search",
    {
      description:
        "Search the spec wiki on the current git branch — semantic when the server has an embedding index, keyword fallback otherwise (mode field tells which). Unlike specraft_query (LLM-synthesized Q&A), this returns ranked page/section candidates with snippets; use it to find citation paths before specraft_read_page. Optional top_k (1-50, default 8).",
      inputSchema: SearchToolInputSchema.shape,
    },
    async (input) =>
      toToolResult(await specraftSearch(context, SearchToolInputSchema.parse(input))),
  )
  registerWikiResources(server, context)
  registerPrompts(server)
  return server
}

function variableValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

function registerWikiResources(server: McpServer, context: ToolContext): void {
  server.registerResource(
    "wiki-page",
    new ResourceTemplate(WIKI_RESOURCE_URI_TEMPLATE, {
      list: async () => {
        try {
          const tree = await specraftTree(context)
          return {
            resources: tree.entries
              .filter((entry) => entry.type === "file")
              .map((entry) => ({
                description: `specraft wiki page ${entry.path} (branch ${tree.branch})`,
                mimeType: "text/markdown",
                name: entry.path,
                uri: wikiResourceUri(tree.branch, entry.path),
              })),
          }
        } catch {
          // 서버/git 미가용 시 @멘션 목록은 비어 있어야 하며 에러를 내면 안 된다(M2.2).
          return { resources: [] }
        }
      },
    }),
    {
      description:
        "Spec wiki pages of the specraft server, addressable per branch. Mention a page to pull its full markdown into context.",
      mimeType: "text/markdown",
      title: "Specraft wiki pages",
    },
    async (uri, variables) => {
      const branch = decodeURIComponent(variableValue(variables["branch"]))
      const path = variableValue(variables["path"])
      const page = await context.client.wikiPage({ branch, path })
      return {
        contents: [{ mimeType: "text/markdown", text: page.content, uri: uri.href }],
      }
    },
  )
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "specraft-review",
    {
      argsSchema: { focus: z.string().optional() },
      description:
        "Review pending work against the spec wiki: rehydrate spec context, query the relevant areas, follow citations to full pages, and report matches/deviations.",
      title: "Spec-grounded review",
    },
    ({ focus }) => ({
      messages: [
        {
          content: {
            text: [
              "Review the current work in this repository against the specraft spec wiki.",
              "",
              "1. Call specraft_context to load the wiki overview and index for this branch.",
              `2. Call specraft_query about the areas touched by the pending changes${
                focus ? ` (focus: ${focus})` : ""
              }.`,
              "3. For each citation returned, call specraft_read_page with the citation path to read the full spec text.",
              "4. Compare the implementation with the documented decisions and report:",
              "   - matches (spec and code agree),",
              "   - deviations (cite path#section of the violated spec),",
              "   - undocumented behavior that should be recorded via specraft_ingest.",
            ].join("\n"),
            type: "text",
          },
          role: "user",
        },
      ],
    }),
  )
}
