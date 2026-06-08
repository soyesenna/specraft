import type { ReactNode } from "react"
import { cn } from "../lib/cn.js"
import { type MarkdownBlock, parseMarkdown } from "../live/markdown.js"

// 인라인 강조: **bold**, ~~strike~~, `code`, [링크](url), *italic* (한 줄 안에서만 매칭)
const INLINE_RE = /(\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\*[^*\n]+\*)/g
const LINK_RE = /^\[([^\]\n]+)\]\(([^)\n]+)\)$/u

/** 한 줄의 인라인 마크다운을 React 노드로 변환한다. 매칭되지 않는 부분은 평문 유지. */
export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((segment, index) => {
    if (segment.length === 0) {
      return null
    }
    const key = `${index}:${segment}`
    if (segment.length > 4 && segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {segment.slice(2, -2)}
        </strong>
      )
    }
    if (segment.length > 4 && segment.startsWith("~~") && segment.endsWith("~~")) {
      return (
        <del key={key} className="text-ink-tertiary line-through">
          {segment.slice(2, -2)}
        </del>
      )
    }
    if (segment.length > 2 && segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-input px-1 py-0.5 font-mono text-[0.88em] text-ink">
          {segment.slice(1, -1)}
        </code>
      )
    }
    const link = LINK_RE.exec(segment)
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-link underline underline-offset-2"
        >
          {link[1]}
        </a>
      )
    }
    if (segment.length > 2 && segment.startsWith("*") && segment.endsWith("*")) {
      return (
        <em key={key} className="italic">
          {segment.slice(1, -1)}
        </em>
      )
    }
    return <span key={key}>{segment}</span>
  })
}

/** 스트리밍 중 텍스트 끝에 표시되는 깜빡이는 커서. */
export function StreamingCursor(): ReactNode {
  return (
    <span className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[2px] animate-pulse rounded-[1px] bg-accent align-middle" />
  )
}

/** 채팅 답변용 마크다운 렌더 — 블록(heading/paragraph/bullets/code) + 인라인 강조. */
export function ChatMarkdown({
  source,
  compact = false,
  cursor = false,
}: {
  source: string
  compact?: boolean
  cursor?: boolean
}): ReactNode {
  const blocks = parseMarkdown(source)
  return (
    <div className={cn("flex w-full flex-col", compact ? "gap-2" : "gap-2.5")}>
      {blocks.map((block, index) => (
        <ChatBlock
          key={blockKey(block, index)}
          block={block}
          compact={compact}
          cursor={cursor && index === blocks.length - 1}
        />
      ))}
    </div>
  )
}

function blockKey(block: MarkdownBlock, index: number): string {
  if (block.kind === "heading") {
    return `${index}:h:${block.text}`
  }
  if (block.kind === "paragraph") {
    return `${index}:p:${block.text}`
  }
  if (block.kind === "bullets") {
    return `${index}:u:${block.items.length}`
  }
  if (block.kind === "ordered") {
    return `${index}:o:${block.items.length}`
  }
  if (block.kind === "quote") {
    return `${index}:q:${block.lines.length}`
  }
  if (block.kind === "table") {
    return `${index}:t:${block.headers.length}`
  }
  if (block.kind === "hr") {
    return `${index}:hr`
  }
  return `${index}:c:${block.lines.length}`
}

function ChatBlock({
  block,
  compact,
  cursor = false,
}: {
  block: MarkdownBlock
  compact: boolean
  cursor?: boolean
}): ReactNode {
  if (block.kind === "heading") {
    return (
      <p
        className={cn(
          "pen-text m-0 font-display font-semibold text-ink",
          compact ? "text-[13px] tracking-[-0.2px]" : "text-[14.5px] tracking-[-0.24px]",
        )}
      >
        {renderInline(block.text)}
      </p>
    )
  }
  if (block.kind === "paragraph") {
    return (
      <p
        className={cn(
          "pen-text m-0 w-full text-ink-secondary",
          compact ? "text-[13px] leading-[1.6]" : "text-[14.5px] leading-[1.7] tracking-[-0.22px]",
        )}
      >
        {renderInline(block.text)}
        {cursor && <StreamingCursor />}
      </p>
    )
  }
  if (block.kind === "bullets") {
    return (
      <div className={cn("flex w-full flex-col", compact ? "gap-1" : "gap-1.5")}>
        {block.items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 재파싱되는 블록 내 위치 기반 키가 스트리밍에 안정적
          <div key={`${index}:${item}`} className="flex w-full gap-2">
            <span className={compact ? "pt-[6px]" : "pt-2"}>
              <span className="block size-[4.5px] rounded-full bg-ink-tertiary" />
            </span>
            <span
              className={cn(
                "pen-text w-full text-ink-secondary",
                compact
                  ? "text-[13px] leading-[1.55]"
                  : "text-[14.5px] leading-[1.6] tracking-[-0.22px]",
              )}
            >
              {renderInline(item)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (block.kind === "ordered") {
    return (
      <ol className={cn("flex w-full list-none flex-col", compact ? "gap-1" : "gap-1.5")}>
        {block.items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 번호 목록은 위치 기반 키 사용
          <li key={`${index}:${item}`} className="flex w-full gap-2">
            <span
              className={cn(
                "pen-text shrink-0 font-medium text-ink-tertiary tabular-nums",
                compact ? "text-[13px] leading-[1.55]" : "text-[14.5px] leading-[1.6]",
              )}
            >
              {index + 1}.
            </span>
            <span
              className={cn(
                "pen-text w-full text-ink-secondary",
                compact
                  ? "text-[13px] leading-[1.55]"
                  : "text-[14.5px] leading-[1.6] tracking-[-0.22px]",
              )}
            >
              {renderInline(item)}
            </span>
          </li>
        ))}
      </ol>
    )
  }
  if (block.kind === "quote") {
    return (
      <blockquote
        className={cn(
          "flex w-full flex-col gap-1 border-accent/40 border-l-2",
          compact ? "pl-2.5" : "pl-3.5",
        )}
      >
        {block.lines.map((line, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 인용 줄은 위치 기반 키 사용
            key={`${index}:${line}`}
            className={cn(
              "pen-text w-full text-ink-tertiary italic",
              compact ? "text-[13px] leading-[1.55]" : "text-[14px] leading-[1.6]",
            )}
          >
            {renderInline(line)}
          </span>
        ))}
      </blockquote>
    )
  }
  if (block.kind === "table") {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {block.headers.map((header, index) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: 표 헤더는 열 위치로 식별
                  key={`${index}:${header}`}
                  className={cn(
                    "border border-separator bg-bg pen-text font-semibold text-ink",
                    compact ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
                  )}
                >
                  {renderInline(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 표 행은 위치로 식별
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: 표 셀은 위치로 식별
                    key={`${rowIndex}:${cellIndex}`}
                    className={cn(
                      "border border-separator pen-text align-top text-ink-secondary",
                      compact ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
                    )}
                  >
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (block.kind === "hr") {
    return <hr className="w-full border-0 border-separator border-t" />
  }
  // code fence
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-x-auto rounded-md bg-dark-card",
        compact ? "px-3 py-2" : "px-[18px] py-3",
      )}
    >
      {block.lines.map((line, index) => (
        <code
          // biome-ignore lint/suspicious/noArrayIndexKey: 코드 줄은 위치로 식별(중복 줄 허용)
          key={`${index}:${line}`}
          className={cn(
            "pen-text whitespace-pre font-mono text-white-secondary",
            compact ? "text-[10.5px] leading-[1.55]" : "text-[12px] leading-[1.6]",
          )}
        >
          {line.length === 0 ? " " : line}
        </code>
      ))}
    </div>
  )
}
