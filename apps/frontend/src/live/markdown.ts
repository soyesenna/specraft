/**
 * 경량 마크다운 파서 — 새 의존성 없이 wiki page 본문을 디자인(MgFM9 Doc Sheet)
 * 구조로 렌더링하기 위한 최소 블록 파서.
 *
 * 지원 범위 (디자인 패턴에 한정):
 *  - heading: `# ` (h1, 본문 H1), `## `~`###### ` (h2 이하)
 *  - bullet: `- ` / `* ` 로 시작하는 연속 줄을 하나의 목록으로
 *  - code: ``` 펜스 블록 (언어 라벨 무시)
 *  - paragraph: 그 외 비어있지 않은 줄 (연속 줄은 한 단락으로 병합)
 *
 * 표/이미지/링크 등 디자인에 없는 인라인 문법은 평문으로 보존한다.
 */

export type MarkdownBlock =
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "bullets"; readonly items: readonly string[] }
  | { readonly kind: "code"; readonly lines: readonly string[] }

const HEADING_RE = /^(#{1,6})\s+(.*)$/u
const BULLET_RE = /^[-*]\s+(.*)$/u
const FENCE_RE = /^```/u

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/gu, "\n").split("\n")
  const blocks: MarkdownBlock[] = []

  let paragraph: string[] = []
  let bullets: string[] = []
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

  for (const line of lines) {
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
      flushParagraph()
      flushBullets()
      codeLines = []
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushParagraph()
      flushBullets()
      const hashes = heading[1] ?? ""
      const text = heading[2] ?? ""
      blocks.push({ kind: "heading", level: hashes.length, text: text.trim() })
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      flushParagraph()
      bullets.push((bullet[1] ?? "").trim())
      continue
    }

    if (line.trim().length === 0) {
      flushParagraph()
      flushBullets()
      continue
    }

    flushBullets()
    paragraph.push(line.trim())
  }

  // 닫히지 않은 펜스는 코드 블록으로 처리
  if (codeLines !== null && codeLines.length > 0) {
    blocks.push({ kind: "code", lines: codeLines })
  }
  flushParagraph()
  flushBullets()

  return blocks
}

/** 본문 H1 (`# `) 을 문서 제목으로 추출 — 없으면 path 기반 fallback */
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
