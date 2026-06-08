/**
 * 경량 마크다운 블록 파서 — 새 의존성 없이 wiki page / 채팅 답변 본문을
 * 구조화된 블록으로 렌더링하기 위한 파서.
 *
 * 지원 블록:
 *  - heading: `# `(h1) ~ `###### `(h6)
 *  - hr: `---`, `***`, `___` (단독 줄)
 *  - table: `| a | b |` + 구분선 `|---|---|` + 데이터 행
 *  - blockquote: `> ` 로 시작하는 연속 줄
 *  - bullets: `-`/`*`/`+` 로 시작하는 연속 줄
 *  - ordered: `1.` `2.` … 로 시작하는 연속 줄
 *  - code: ``` 펜스 블록 (언어 라벨 무시)
 *  - paragraph: 그 외 비어있지 않은 줄 (연속 줄은 한 단락으로 병합)
 *
 * 인라인 강조(**bold**, `code`, *italic*, [링크](url), ~~취소선~~)는 렌더 계층에서 처리한다.
 */

export type MarkdownBlock =
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "bullets"; readonly items: readonly string[] }
  | { readonly kind: "ordered"; readonly items: readonly string[] }
  | { readonly kind: "quote"; readonly lines: readonly string[] }
  | { readonly kind: "code"; readonly lines: readonly string[] }
  | {
      readonly kind: "table"
      readonly headers: readonly string[]
      readonly rows: readonly (readonly string[])[]
    }
  | { readonly kind: "hr" }

const HEADING_RE = /^(#{1,6})\s+(.*)$/u
const BULLET_RE = /^[-*+]\s+(.*)$/u
const ORDERED_RE = /^\d+[.)]\s+(.*)$/u
const QUOTE_RE = /^>\s?(.*)$/u
const FENCE_RE = /^```/u
const HR_RE = /^(?:-{3,}|\*{3,}|_{3,})$/u
// 테이블 구분선: `|`·`-` 를 모두 포함하고 `-`, `|`, `:`, 공백으로만 구성 (단일 컬럼 |---| 포함)
function isTableDivider(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.includes("|") && trimmed.includes("-") && /^[-|:\s]+$/u.test(trimmed)
}

/** `| a | b |` 한 줄을 셀 배열로 분해한다(양끝 파이프 제거). */
function splitTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith("|")) {
    trimmed = trimmed.slice(1)
  }
  if (trimmed.endsWith("|")) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed.split("|").map((cell) => cell.trim())
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/gu, "\n").split("\n")
  const blocks: MarkdownBlock[] = []

  let paragraph: string[] = []
  let bullets: string[] = []
  let ordered: string[] = []
  let quote: string[] = []
  let codeLines: string[] | null = null

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() })
      paragraph = []
    }
  }
  const flushBullets = (): void => {
    if (bullets.length > 0) {
      blocks.push({ kind: "bullets", items: bullets })
      bullets = []
    }
  }
  const flushOrdered = (): void => {
    if (ordered.length > 0) {
      blocks.push({ kind: "ordered", items: ordered })
      ordered = []
    }
  }
  const flushQuote = (): void => {
    if (quote.length > 0) {
      blocks.push({ kind: "quote", lines: quote })
      quote = []
    }
  }
  const flushAll = (): void => {
    flushParagraph()
    flushBullets()
    flushOrdered()
    flushQuote()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ""

    // 코드 펜스 안: 닫는 펜스 전까지 원문 보존
    if (codeLines !== null) {
      if (FENCE_RE.test(line)) {
        blocks.push({ kind: "code", lines: codeLines })
        codeLines = null
      } else {
        codeLines.push(line)
      }
      continue
    }

    if (FENCE_RE.test(line)) {
      flushAll()
      codeLines = []
      continue
    }

    // 테이블: 현재 줄에 `|` 가 있고 다음 줄이 구분선이면 표로 처리
    const nextLine = (lines[index + 1] ?? "").trim()
    if (line.includes("|") && line.trim() !== "" && isTableDivider(nextLine)) {
      flushAll()
      const headers = splitTableRow(line)
      index += 1 // 구분선 소비
      const rows: string[][] = []
      while (index + 1 < lines.length) {
        const rowLine = lines[index + 1] ?? ""
        if (rowLine.trim() === "" || !rowLine.includes("|")) {
          break
        }
        rows.push(splitTableRow(rowLine))
        index += 1
      }
      blocks.push({ kind: "table", headers, rows })
      continue
    }

    // 수평선
    if (HR_RE.test(line.trim())) {
      flushAll()
      blocks.push({ kind: "hr" })
      continue
    }

    // heading
    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushAll()
      blocks.push({
        kind: "heading",
        level: (heading[1] ?? "").length,
        text: (heading[2] ?? "").trim(),
      })
      continue
    }

    // blockquote
    const quoteMatch = QUOTE_RE.exec(line)
    if (quoteMatch) {
      flushParagraph()
      flushBullets()
      flushOrdered()
      quote.push((quoteMatch[1] ?? "").trim())
      continue
    }

    // ordered list
    const orderedMatch = ORDERED_RE.exec(line)
    if (orderedMatch) {
      flushParagraph()
      flushBullets()
      flushQuote()
      ordered.push((orderedMatch[1] ?? "").trim())
      continue
    }

    // bullet list
    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      flushParagraph()
      flushOrdered()
      flushQuote()
      bullets.push((bullet[1] ?? "").trim())
      continue
    }

    // 빈 줄: 모든 누적 블록 종료
    if (line.trim().length === 0) {
      flushAll()
      continue
    }

    // 일반 단락
    flushBullets()
    flushOrdered()
    flushQuote()
    paragraph.push(line.trim())
  }

  // 닫히지 않은 펜스는 코드 블록으로 처리
  if (codeLines !== null && codeLines.length > 0) {
    blocks.push({ kind: "code", lines: codeLines })
  }
  flushAll()

  return blocks
}

/** 본문 H1 (`# `) 을 문서 제목으로 추출 — 없으면 fallback */
export function titleFromBlocks(blocks: readonly MarkdownBlock[], fallback: string): string {
  const h1 = blocks.find((block) => block.kind === "heading" && block.level === 1)
  if (h1 && h1.kind === "heading") {
    return h1.text
  }
  return fallback
}

/** 본문에서 H1 을 제외한 블록 — Doc Sheet 본문 렌더용 */
export function bodyBlocks(blocks: readonly MarkdownBlock[]): MarkdownBlock[] {
  let h1Seen = false
  return blocks.filter((block) => {
    if (!h1Seen && block.kind === "heading" && block.level === 1) {
      h1Seen = true
      return false
    }
    return true
  })
}
