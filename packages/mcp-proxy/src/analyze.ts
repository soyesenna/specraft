// M4+ — specraft_analyze: git 변경 파일과 연관된 spec 위키 페이지·미해결 질문을 수집한다.
// 도구는 자료 수집만 담당하고 drift 판단은 호스트 LLM의 몫이다(proxy에는 LLM이 없다).
import { z } from "zod"

import type { ToolContext } from "./tools.js"

export const AnalyzeToolInputSchema = z.object({
  paths: z.array(z.string().min(1)).optional(),
})

/** 응답 비대화 방지: 연관 페이지 수와 페이지당 발췌 길이 상한. */
export const MAX_RELATED_PAGES = 5
export const EXCERPT_MAX_CHARS = 700

export type AnalyzeRelatedPage = {
  readonly path: string
  readonly content_excerpt: string
}

export type AnalyzeResult = {
  readonly branch: string
  readonly changed_files: readonly string[]
  readonly related_pages: readonly AnalyzeRelatedPage[]
  readonly open_questions: readonly string[]
}

const TOKEN_STOPWORDS = new Set([
  "apps",
  "build",
  "dist",
  "docs",
  "index",
  "lib",
  "main",
  "node",
  "packages",
  "src",
  "test",
  "tests",
])

/** 파일/페이지 경로를 소문자 토큰으로 분해한다(확장자 제거, 3자 미만·불용어 제외). */
export function pathTokens(path: string): readonly string[] {
  const withoutExtension = path.replace(/\.[a-z0-9]+$/i, "")
  return [
    ...new Set(
      withoutExtension
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token)),
    ),
  ]
}

/**
 * 위키 페이지 경로를 변경 파일과의 토큰 교집합 크기로 순위화한다.
 * 점수 0은 제외하고 점수 내림차순(동점은 경로 오름차순)으로 반환한다.
 */
export function rankRelatedPages(
  pagePaths: readonly string[],
  changedFiles: readonly string[],
): readonly string[] {
  const changedTokens = new Set(changedFiles.flatMap((file) => pathTokens(file)))
  return pagePaths
    .map((path) => ({
      path,
      score: pathTokens(path).filter((token) => changedTokens.has(token)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .map((entry) => entry.path)
}

/**
 * 위키 페이지의 `## Open Questions` 섹션에서 bullet을 추출한다.
 * 다음 헤딩에서 멈추고 placeholder(`- none`)는 버린다.
 */
export function extractOpenQuestions(content: string): readonly string[] {
  const questions: string[] = []
  let inSection = false
  for (const line of content.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      inSection = /^#{1,6}\s+open questions\s*$/i.test(line)
      continue
    }
    if (!inSection) {
      continue
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line.trim())?.[1]?.trim()
    if (bullet !== undefined && bullet !== "" && bullet.toLowerCase() !== "none") {
      questions.push(bullet)
    }
  }
  return questions
}

export function excerptContent(content: string): string {
  if (content.length <= EXCERPT_MAX_CHARS) {
    return content
  }
  return `${content.slice(0, EXCERPT_MAX_CHARS)}\n…[truncated]`
}

async function resolveChangedFiles(
  context: ToolContext,
  input: { readonly paths?: readonly string[] | undefined },
): Promise<readonly string[]> {
  if (input.paths !== undefined && input.paths.length > 0) {
    return [...new Set(input.paths)].sort()
  }
  if (!context.changedFiles) {
    throw new Error("git diff collection is unavailable; pass paths explicitly")
  }
  return context.changedFiles()
}

/**
 * drift 검토 자료 수집: ① 변경 파일(HEAD 대비 + staged, 또는 명시 paths)
 * ② 변경 파일과 토큰이 겹치는 위키 페이지 발췌 ③ 그 페이지들의 미해결 질문.
 */
export async function specraftAnalyze(
  context: ToolContext,
  input: { readonly paths?: readonly string[] | undefined } = {},
): Promise<AnalyzeResult> {
  const snapshot = await context.gitSnapshot()
  const changedFiles = await resolveChangedFiles(context, input)
  if (changedFiles.length === 0) {
    return { branch: snapshot.branch, changed_files: [], open_questions: [], related_pages: [] }
  }
  const tree = await context.client.wikiTree({ branch: snapshot.branch })
  const pagePaths = tree.entries.filter((entry) => entry.type === "file").map((entry) => entry.path)
  const relatedPaths = rankRelatedPages(pagePaths, changedFiles).slice(0, MAX_RELATED_PAGES)
  const relatedPages: AnalyzeRelatedPage[] = []
  const openQuestions = new Set<string>()
  for (const path of relatedPaths) {
    const page = await context.client.wikiPage({ branch: snapshot.branch, path })
    relatedPages.push({ content_excerpt: excerptContent(page.content), path })
    for (const question of extractOpenQuestions(page.content)) {
      openQuestions.add(question)
    }
  }
  return {
    branch: snapshot.branch,
    changed_files: changedFiles,
    open_questions: [...openQuestions],
    related_pages: relatedPages,
  }
}
