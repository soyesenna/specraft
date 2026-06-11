import type { Citation, IngestPayload, Member, QueryResponse } from "@specraft/shared"

import {
  commitWiki,
  listWikiFiles,
  readWikiFile,
  type WikiRepository,
  writeWikiFile,
} from "../git/sync.js"
import {
  type LLMProvider,
  runToolLoop,
  runToolLoopStream,
  type StreamToolCall,
  type StreamToolResult,
} from "../llm/provider.js"
import { createReadOnlyWikiTools, createWikiTools } from "../llm/wiki-tools.js"

type RankedPage = {
  readonly content: string
  readonly path: string
  readonly score: number
  readonly section: string
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-")
}

function timestampMinute(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ")
}

function tokens(value: string): readonly string[] {
  return [...new Set(value.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [])].filter(
    (token) => token.length > 2,
  )
}

function changePagePath(payload: IngestPayload): string {
  return `changes/${safePathSegment(payload.session_id)}.md`
}

function specChangeLines(payload: IngestPayload): string {
  return payload.spec_changes
    .map(
      (change) => `- ${change.type} ${change.area}: ${change.description}\n  - ${change.reasoning}`,
    )
    .join("\n")
}

function progressLines(payload: IngestPayload): string {
  if (payload.progress_updates.length === 0) {
    return "- none"
  }
  return payload.progress_updates
    .map((progress) => `- ${progress.feature} [${progress.status}]: ${progress.note}`)
    .join("\n")
}

function openQuestionLines(payload: IngestPayload): string {
  if (payload.open_questions.length === 0) {
    return "- none"
  }
  return payload.open_questions.map((question) => `- ${question}`).join("\n")
}

function renderChangePage(payload: IngestPayload, member: Member): string {
  return `# Ingest ${payload.session_id}

Summary: ${payload.summary}
Branch: ${payload.branch}
Commit: ${payload.commit_hash}
Agent: ${payload.agent}
Author: ${member.name} <${member.email}>

## Spec Changes

${specChangeLines(payload)}

## Progress Updates

${progressLines(payload)}

## Open Questions

${openQuestionLines(payload)}
`
}

function renderIndex(wiki: WikiRepository): string {
  const entries = listWikiFiles(wiki)
    .filter((path) => path.endsWith(".md") && path !== "index.md")
    .map((path) => `- [${path}](${path})`)
    .join("\n")
  return `# Index

${entries}
`
}

export function appendIngestToWiki(
  wiki: WikiRepository,
  member: Member,
  payload: IngestPayload,
): string {
  const pagePath = changePagePath(payload)
  const current = readWikiFile(wiki, "log.md")
  writeWikiFile(
    wiki,
    "log.md",
    `${current}\n## [${timestampMinute()}] ingest | ${payload.summary} | by ${member.name}\n- [${pagePath}](${pagePath})\n`,
  )
  writeWikiFile(wiki, pagePath, renderChangePage(payload, member))
  writeWikiFile(wiki, "index.md", renderIndex(wiki))
  return commitWiki(wiki, {
    authorEmail: member.email,
    authorName: member.name,
    message: `ingest: ${payload.summary}`,
  })
}

export async function ingestWikiWithAgent(input: {
  readonly member: Member
  readonly payload: IngestPayload
  readonly provider: LLMProvider | undefined
  readonly wiki: WikiRepository
}): Promise<string> {
  if (input.provider) {
    await runToolLoop({
      messages: [
        {
          role: "system",
          content:
            "You are the specraft Ingest Agent. Use wiki tools to inspect or update project wiki pages. Preserve index.md and log.md integrity.",
        },
        { role: "user", content: JSON.stringify(input.payload) },
      ],
      provider: input.provider,
      tools: createWikiTools(input.wiki.root),
    })
  }
  return appendIngestToWiki(input.wiki, input.member, input.payload)
}

function sectionFor(path: string, content: string, queryTokens: readonly string[]): string {
  if (path.startsWith("changes/") && content.includes("## Spec Changes")) {
    return "Spec Changes"
  }
  const lines = content.split("\n")
  let section = "Overview"
  for (const line of lines) {
    if (line.startsWith("#")) {
      section = line.replace(/^#+\s*/, "")
    }
    if (queryTokens.some((token) => line.toLowerCase().includes(token))) {
      return section
    }
  }
  return section
}

function scorePage(path: string, content: string, queryTokens: readonly string[]): RankedPage {
  const normalizedPath = path.toLowerCase()
  const normalizedContent = content.toLowerCase()
  const score = queryTokens.reduce((sum, token) => {
    const pathScore = normalizedPath.includes(token) ? 3 : 0
    const contentScore = normalizedContent.includes(token) ? 1 : 0
    return sum + pathScore + contentScore
  }, 0)
  return { content, path, score, section: sectionFor(path, content, queryTokens) }
}

function snippets(page: RankedPage, queryTokens: readonly string[]): readonly string[] {
  return page.content
    .split("\n")
    .filter((line) => queryTokens.some((token) => line.toLowerCase().includes(token)))
    .slice(0, 4)
}

export function answerWikiQuestion(
  wiki: WikiRepository,
  question: string,
  queryId: string,
): QueryResponse {
  const queryTokens = tokens(question)
  const ranked = listWikiFiles(wiki)
    .filter((path) => path.endsWith(".md"))
    .map((path) => scorePage(path, readWikiFile(wiki, path), queryTokens))
    .filter((page) => page.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, 3)
  const pages =
    ranked.length > 0 ? ranked : [scorePage("overview.md", readWikiFile(wiki, "overview.md"), [])]
  const citations: Citation[] = pages.map((page) => ({
    path: page.path,
    section: page.section,
  }))
  const answer = pages
    .map((page) => {
      const pageSnippets = snippets(page, queryTokens)
      const body = pageSnippets.length > 0 ? pageSnippets.join("\n") : page.content.trim()
      return `## ${page.path}#${page.section}\n${body}`
    })
    .join("\n\n")
  return { answer, citations, query_id: queryId }
}

function citationsFromAnswer(answer: string): Citation[] {
  const matches = answer.matchAll(/\[?([a-zA-Z0-9._/-]+\.md)#([^\]\s]+)\]?/g)
  return [...matches].map((match) => ({
    path: match[1] ?? "overview.md",
    section: match[2] ?? "Overview",
  }))
}

export async function answerWikiQuestionWithAgent(input: {
  readonly provider: LLMProvider | undefined
  readonly queryId: string
  readonly question: string
  readonly wiki: WikiRepository
}): Promise<QueryResponse> {
  if (!input.provider) {
    return answerWikiQuestion(input.wiki, input.question, input.queryId)
  }
  const fallback = answerWikiQuestion(input.wiki, input.question, input.queryId)
  const response = await runToolLoop({
    messages: [
      {
        role: "system",
        content:
          "You are the specraft Query Agent. Use wiki tools, answer with concrete citations in the form [path.md#Section].",
      },
      { role: "user", content: input.question },
    ],
    provider: input.provider,
    // Query Agent는 read 전용 — 위키 변경 도구(wiki_write/wiki_delete)를 노출하지 않는다 (M3.4).
    tools: createReadOnlyWikiTools(input.wiki.root),
  })
  const citations = citationsFromAnswer(response.content)
  return {
    answer: response.content,
    citations: citations.length > 0 ? citations : fallback.citations,
    query_id: input.queryId,
  }
}

/** 스트리밍 질의 응답. 토큰(onDelta)과 도구 호출/결과(onToolCall/onToolResult)를 통지하고 최종 QueryResponse를 반환한다. */
export async function answerWikiQuestionWithAgentStream(input: {
  readonly provider: LLMProvider | undefined
  readonly queryId: string
  readonly question: string
  readonly wiki: WikiRepository
  readonly onDelta: (text: string) => void
  readonly onToolCall: (call: StreamToolCall) => void
  readonly onToolResult: (result: StreamToolResult) => void
}): Promise<QueryResponse> {
  const fallback = answerWikiQuestion(input.wiki, input.question, input.queryId)
  if (!input.provider) {
    if (fallback.answer.length > 0) {
      input.onDelta(fallback.answer)
    }
    return fallback
  }
  const response = await runToolLoopStream({
    messages: [
      {
        role: "system",
        content:
          "You are the specraft Query Agent. Use wiki tools, answer with concrete citations in the form [path.md#Section].",
      },
      { role: "user", content: input.question },
    ],
    onDelta: input.onDelta,
    onToolCall: input.onToolCall,
    onToolResult: input.onToolResult,
    provider: input.provider,
    // Query Agent는 read 전용 — 위키 변경 도구(wiki_write/wiki_delete)를 노출하지 않는다 (M3.4).
    tools: createReadOnlyWikiTools(input.wiki.root),
  })
  const citations = citationsFromAnswer(response.content)
  return {
    answer: response.content,
    citations: citations.length > 0 ? citations : fallback.citations,
    query_id: input.queryId,
  }
}
