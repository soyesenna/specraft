import type { Citation, IngestPayload, Member, QueryResponse } from "@specraft/shared"

import {
  commitWiki,
  listWikiFiles,
  readWikiFile,
  type WikiRepository,
  writeWikiFile,
} from "../git/sync.js"

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
