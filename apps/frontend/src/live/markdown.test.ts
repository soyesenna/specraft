import { describe, expect, it } from "vitest"
import { type MarkdownBlock, parseMarkdown } from "./markdown.js"

describe("parseMarkdown", () => {
  it("heading 레벨을 파싱한다", () => {
    expect(parseMarkdown("## Title")).toEqual([{ kind: "heading", level: 2, text: "Title" }])
    expect(parseMarkdown("###### Deep")).toEqual([{ kind: "heading", level: 6, text: "Deep" }])
  })

  it("단락을 병합한다", () => {
    expect(parseMarkdown("line a\nline b")).toEqual([{ kind: "paragraph", text: "line a line b" }])
  })

  it("불릿 목록을 파싱한다 (-, *, +)", () => {
    expect(parseMarkdown("- a\n* b\n+ c")).toEqual([{ kind: "bullets", items: ["a", "b", "c"] }])
  })

  it("번호 목록을 파싱한다 (1. 과 1) 모두)", () => {
    expect(parseMarkdown("1. one\n2. two")).toEqual([{ kind: "ordered", items: ["one", "two"] }])
    expect(parseMarkdown("1) a\n2) b")).toEqual([{ kind: "ordered", items: ["a", "b"] }])
  })

  it("인용을 파싱한다", () => {
    expect(parseMarkdown("> quoted\n> second")).toEqual([
      { kind: "quote", lines: ["quoted", "second"] },
    ])
  })

  it("수평선을 파싱한다 (---, ***, ___)", () => {
    expect(parseMarkdown("---")).toEqual([{ kind: "hr" }])
    expect(parseMarkdown("***")).toEqual([{ kind: "hr" }])
    expect(parseMarkdown("___")).toEqual([{ kind: "hr" }])
  })

  it("코드 펜스를 원문 보존한다", () => {
    expect(parseMarkdown("```ts\nconst x = 1\n```")).toEqual([
      { kind: "code", lines: ["const x = 1"] },
    ])
  })

  it("표를 헤더/행으로 파싱한다", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
    expect(parseMarkdown(md)).toEqual([
      {
        kind: "table",
        headers: ["A", "B"],
        rows: [
          ["1", "2"],
          ["3", "4"],
        ],
      },
    ])
  })

  it("정렬 구분선(:--:)이 있는 표도 파싱한다", () => {
    const md = "| L | C | R |\n|:--|:-:|--:|\n| a | b | c |"
    const blocks = parseMarkdown(md)
    expect(blocks[0]?.kind).toBe("table")
    const table = blocks[0] as Extract<MarkdownBlock, { kind: "table" }>
    expect(table.headers).toEqual(["L", "C", "R"])
    expect(table.rows).toEqual([["a", "b", "c"]])
  })

  it("표 다음의 빈 줄과 단락을 분리한다", () => {
    const blocks = parseMarkdown("| A |\n|---|\n| 1 |\n\nAfter table")
    expect(blocks[0]?.kind).toBe("table")
    expect(blocks[1]).toEqual({ kind: "paragraph", text: "After table" })
  })

  it("구분선과 표 구분선을 혼동하지 않는다", () => {
    // 앞 줄에 파이프가 없으면 --- 는 표가 아니라 수평선
    expect(parseMarkdown("text\n\n---\n\nmore")).toEqual([
      { kind: "paragraph", text: "text" },
      { kind: "hr" },
      { kind: "paragraph", text: "more" },
    ])
  })

  it("혼합 문서의 블록 순서를 보존한다", () => {
    const md = [
      "# Heading",
      "",
      "intro para",
      "",
      "- bullet 1",
      "- bullet 2",
      "",
      "1. first",
      "2. second",
      "",
      "> a quote",
      "",
      "---",
      "",
      "| Col1 | Col2 |",
      "|------|------|",
      "| v1   | v2   |",
      "",
      "```",
      "code line",
      "```",
    ].join("\n")
    const kinds = parseMarkdown(md).map((block) => block.kind)
    expect(kinds).toEqual([
      "heading",
      "paragraph",
      "bullets",
      "ordered",
      "quote",
      "hr",
      "table",
      "code",
    ])
  })
})
