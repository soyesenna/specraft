import type { IngestLog, WikiGraphResponse, WikiPageResponse } from "@specraft/shared"
import {
  AlertTriangle,
  ChevronLeft,
  CornerDownRight,
  FileText,
  History,
  Lock,
  RefreshCw,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ButtonSecondary } from "../components/buttons.js"
import { IconButton } from "../components/IconButton.js"
import { renderInline } from "../components/Markdown.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { LiveShell } from "./LiveShell.js"
import { bodyBlocks, type MarkdownBlock, parseMarkdown, titleFromBlocks } from "./markdown.js"

/** docId(라우트 파라미터)는 encodeURIComponent(wiki path) 이므로 디코드해서 사용 */
function decodeDocId(docId: string | undefined): string {
  if (!docId) {
    return "overview.md"
  }
  try {
    return decodeURIComponent(docId)
  } catch {
    return docId
  }
}

function fileLabel(path: string): string {
  const segments = path.split("/")
  return segments[segments.length - 1] ?? path
}

function dirLabel(dir: string): string {
  const trimmed = dir.replace(/^\.\/?/u, "").replace(/\/$/u, "")
  if (trimmed.length === 0 || trimmed === ".") {
    return "ROOT"
  }
  return trimmed.toUpperCase()
}

/** path 의 디렉터리 부분을 섹션 라벨로 (없으면 ROOT) */
function dirLabelOf(path: string): string {
  return dirLabel(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "")
}

/** 동일 콘텐츠가 반복될 수 있는 줄 목록에 안정 키 부여 (index 키 회피) */
function lineKeyer(prefix: string): (line: string) => string {
  const seen = new Map<string, number>()
  return (line) => {
    const count = seen.get(line) ?? 0
    seen.set(line, count + 1)
    return `${prefix}:${line}#${count}`
  }
}

/** 본문 블록의 콘텐츠 기반 안정 키 (반복 블록은 keyer 로 dedup) */
function blockKey(block: MarkdownBlock, keyer: (line: string) => string): string {
  if (block.kind === "heading") {
    return keyer(`h${block.level}:${block.text}`)
  }
  if (block.kind === "paragraph") {
    return keyer(`p:${block.text}`)
  }
  if (block.kind === "bullets") {
    return keyer(`ul:${block.items.join("|")}`)
  }
  if (block.kind === "ordered") {
    return keyer(`ol:${block.items.join("|")}`)
  }
  if (block.kind === "quote") {
    return keyer(`quote:${block.lines.join("|")}`)
  }
  if (block.kind === "table") {
    return keyer(`table:${block.headers.join("|")}:${block.rows.length}`)
  }
  if (block.kind === "hr") {
    return keyer("hr")
  }
  return keyer(`pre:${block.lines.join("|")}`)
}

type TreeSection = {
  readonly section: string
  readonly docs: ReadonlyArray<{ readonly path: string; readonly label: string }>
}

/** wikiGraph nodes 를 dir 별로 그룹핑 (디자인 06: CORE/SPECS/… 대문자 라벨) */
function buildTree(graph: WikiGraphResponse | null): TreeSection[] {
  if (!graph) {
    return []
  }
  const order: string[] = []
  const grouped = new Map<string, Array<{ path: string; label: string }>>()
  for (const node of graph.nodes) {
    const section = dirLabel(node.dir)
    if (!grouped.has(section)) {
      grouped.set(section, [])
      order.push(section)
    }
    grouped.get(section)?.push({ path: node.path, label: fileLabel(node.path) })
  }
  return order.map((section) => ({
    section,
    docs: grouped.get(section) ?? [],
  }))
}

/** 05 · Document (S3pyXZ) + M05 (t6x6KS) — 디자인 충실 + 실데이터 */
export function DocumentPage() {
  const { client } = useSpecraft()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()
  const { docId } = useParams()
  const path = decodeDocId(docId)

  const [graph, setGraph] = useState<WikiGraphResponse | null>(null)
  const [page, setPage] = useState<WikiPageResponse | null>(null)
  const [ingests, setIngests] = useState<readonly IngestLog[]>([])
  const [error, setError] = useState<string | null>(null)
  /** Retry CTA가 페이지 본문 fetch effect를 다시 트리거하기 위한 nonce */
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    void client
      .wikiGraph({ branch: selectedBranch })
      .then((response) => {
        if (active) {
          setGraph(response)
        }
      })
      .catch(() => {
        // 그래프 로드 실패 시 트리/백링크는 빈 상태 (페이지 본문은 별도 로드)
      })
    return () => {
      active = false
    }
  }, [client, selectedBranch])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey는 Retry 버튼이 동일 입력으로 재요청을 강제하는 의도적 트리거 의존성.
  useEffect(() => {
    let active = true
    // 경로/브랜치 변경·Retry 시 로딩 스켈레톤이 다시 보이도록 page를 비운다.
    setPage(null)
    setError(null)
    void client
      .wikiPage({ branch: selectedBranch, path })
      .then((response) => {
        if (active) {
          setPage(response)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load wiki page")
        }
      })
    return () => {
      active = false
    }
  }, [client, selectedBranch, path, reloadKey])

  const retryPage = () => {
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    let active = true
    void client
      .listIngestLogs({ limit: 5 })
      .then((response) => {
        if (active) {
          setIngests(response.logs)
        }
      })
      .catch(() => {
        // ingest 로그 로드 실패 시 RECENT INGESTS 는 빈 상태
      })
    return () => {
      active = false
    }
  }, [client])

  const blocks = useMemo(() => parseMarkdown(page?.content ?? ""), [page])
  const title = titleFromBlocks(blocks, fileLabel(path))
  const body = useMemo<ReadonlyArray<{ key: string; block: MarkdownBlock }>>(() => {
    const keyer = lineKeyer("block")
    return bodyBlocks(blocks).map((block) => ({ key: blockKey(block, keyer), block }))
  }, [blocks])
  const tree = useMemo(() => buildTree(graph), [graph])
  const headings = useMemo(
    () =>
      body
        .map((entry) => entry.block)
        .filter(
          (block): block is Extract<MarkdownBlock, { kind: "heading" }> => block.kind === "heading",
        ),
    [body],
  )
  const firstHeading = headings[0]
  const backlinks = useMemo(() => {
    if (!graph) {
      return []
    }
    return graph.edges.filter((edge) => edge.to === path).map((edge) => edge.from)
  }, [graph, path])

  const historyHref = `/specs/doc/${encodeURIComponent(path)}/history`
  // 로딩: page 미도착 && 에러 없음. fetch 실패 후 body가 비어있으면 에러 상태로 본다.
  const pageLoading = page === null && error === null
  const pageError = error !== null && page === null

  return (
    <>
      {/* ───── 데스크톱 05 ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title=""
          titlePrefix={
            <div className="flex items-center gap-3">
              <IconButton icon={ChevronLeft} onClick={() => navigate("/specs")} aria-label="뒤로" />
              <div className="flex items-center gap-1.5">
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                  {dirLabelOf(path)} /
                </span>
                <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                  {fileLabel(path)}
                </span>
              </div>
              <div className="flex items-center gap-[5px] rounded-pill bg-input px-2.5 py-1">
                <Lock className="size-[11px] text-ink-tertiary" />
                <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-tertiary">
                  Read-only · LLM-maintained
                </span>
              </div>
            </div>
          }
          titleRight={
            <button
              type="button"
              onClick={() => navigate(historyHref)}
              className="flex items-center justify-center gap-1.5 rounded-sm bg-input px-4 py-2"
            >
              <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">History</span>
            </button>
          }
        >
          <div className="flex min-h-0 w-full flex-1 gap-[26px] px-7 pb-7">
            {/* Wiki Tree — 768~1023px에서는 clamp로 압착 완화, lg(1024px+)부터 정본 230px 고정 */}
            <nav className="flex w-[clamp(184px,24vw,230px)] shrink-0 flex-col gap-px overflow-y-auto lg:w-[230px]">
              {tree.map((group) => (
                <div key={group.section} className="flex flex-col gap-px">
                  <div className="flex h-[30px] items-end px-2.5 pb-2">
                    <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                      {group.section}
                    </span>
                  </div>
                  {group.docs.map((doc) => {
                    const docActive = doc.path === path
                    return (
                      <button
                        key={doc.path}
                        type="button"
                        onClick={() => navigate(`/specs/doc/${encodeURIComponent(doc.path)}`)}
                        className={cn(
                          "flex h-[30px] w-full items-center gap-[7px] rounded-[6px] px-2.5 text-left transition-colors duration-150 ease-[var(--ease-standard)]",
                          docActive ? "bg-surface" : "hover:bg-hairline",
                        )}
                      >
                        <FileText
                          className={cn(
                            "size-3 shrink-0",
                            docActive ? "text-ink" : "text-ink-tertiary",
                          )}
                        />
                        <span
                          className={cn(
                            "pen-text truncate text-[13px] tracking-[-0.2px]",
                            docActive ? "font-semibold text-ink" : "text-ink-secondary",
                          )}
                        >
                          {doc.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
            {/* Doc Sheet */}
            <article className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-surface px-11 py-9">
              {pageError ? (
                <DocErrorState message={error ?? ""} onRetry={retryPage} />
              ) : pageLoading ? (
                <DocSkeleton />
              ) : (
                <>
                  <h1 className="pen-text m-0 w-full font-display text-[28px] leading-[1.15] font-semibold tracking-[-0.4px] text-ink">
                    {title}
                  </h1>
                  <span className="pen-text w-full text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                    {path} · {selectedBranch}
                  </span>
                  <div className="h-px w-full shrink-0 bg-hairline" />
                  {body.map((entry) => (
                    <DocBlock key={entry.key} block={entry.block} />
                  ))}
                </>
              )}
            </article>
            {/* Doc Rail — 768~1023px에서는 본문 압착 방지를 위해 숨기고, lg(1024px+)부터 정본 248px 노출 */}
            <aside className="hidden w-[248px] shrink-0 flex-col gap-3.5 overflow-y-auto pt-2 pl-1 lg:flex">
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                ON THIS PAGE
              </span>
              <div className="flex w-full flex-col">
                {headings.length === 0 ? (
                  <span className="flex h-[26px] items-center">
                    <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                      섹션 없음
                    </span>
                  </span>
                ) : (
                  headings.map((heading) => (
                    <span key={`otp-${heading.text}`} className="flex h-[26px] items-center">
                      <span
                        className={cn(
                          "pen-text text-[12.5px] tracking-[-0.12px]",
                          heading === firstHeading ? "font-semibold text-ink" : "text-ink-tertiary",
                        )}
                      >
                        {heading.text}
                      </span>
                    </span>
                  ))
                )}
              </div>
              <div className="h-px w-full bg-hairline" />
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                BACKLINKS · {backlinks.length}
              </span>
              <div className="flex w-full flex-col gap-[9px]">
                {backlinks.length === 0 ? (
                  <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                    들어오는 링크 없음
                  </span>
                ) : (
                  backlinks.map((doc) => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => navigate(`/specs/doc/${encodeURIComponent(doc)}`)}
                      className="flex w-full items-center gap-[7px] text-left"
                    >
                      <CornerDownRight className="size-3 shrink-0 text-ink-tertiary" />
                      <span className="pen-text truncate text-[13px] tracking-[-0.2px] text-link">
                        {fileLabel(doc)}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="h-px w-full bg-hairline" />
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                RECENT INGESTS
              </span>
              <div className="flex w-full flex-col gap-3">
                {ingests.length === 0 ? (
                  <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
                    최근 ingest 없음
                  </span>
                ) : (
                  ingests.map((log) => (
                    <RecentIngest
                      key={log.id}
                      initials={actorInitials(log.member.name)}
                      name={log.member.name}
                      time={relativeTime(log.created_at)}
                      desc={log.summary || `${log.branch} @ ${log.commit_hash.slice(0, 7)}`}
                    />
                  ))
                )}
              </div>
            </aside>
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M05 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
          <button
            type="button"
            onClick={() => navigate("/specs")}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-4 text-ink-secondary" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="pen-text truncate text-[15.5px] font-semibold tracking-[-0.24px] text-ink">
              {fileLabel(path)}
            </span>
            <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              {dirLabelOf(path)} · {selectedBranch}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(historyHref)}
            className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input"
            aria-label="History"
          >
            <History className="size-[13px] text-ink-secondary" />
          </button>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input">
            <Lock className="size-3 text-ink-tertiary" />
          </span>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col px-3 pb-4">
          <article className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto rounded-md bg-surface px-[18px] py-5">
            {pageError ? (
              <DocErrorState message={error ?? ""} onRetry={retryPage} mobile />
            ) : pageLoading ? (
              <DocSkeleton mobile />
            ) : (
              <>
                <h1 className="pen-text m-0 w-full font-display text-[21px] leading-[1.2] font-semibold tracking-[-0.32px] text-ink">
                  {title}
                </h1>
                <span className="pen-text w-full text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                  {path}
                </span>
                <div className="h-px w-full shrink-0 bg-hairline" />
                {body.map((entry) => (
                  <DocBlock key={`m-${entry.key}`} block={entry.block} mobile />
                ))}
                {backlinks.length > 0 && (
                  <>
                    <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
                      BACKLINKS · {backlinks.length}
                    </span>
                    <div className="flex w-full flex-col gap-2">
                      {backlinks.map((doc) => (
                        <button
                          key={doc}
                          type="button"
                          onClick={() => navigate(`/specs/doc/${encodeURIComponent(doc)}`)}
                          className="flex items-center gap-[7px] text-left"
                        >
                          <CornerDownRight className="size-3 shrink-0 text-ink-tertiary" />
                          <span className="pen-text truncate text-[12.5px] tracking-[-0.12px] text-link">
                            {fileLabel(doc)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </article>
        </div>
      </div>
    </>
  )
}

/**
 * DESIGN.md §14 Loading(Skeleton): 최종 콘텐츠와 동일한 치수·radius의 bg(input) 블록.
 * 제목/메타/구분선/본문 단락 구조를 보존하고 animate-pulse로 shimmer(blue-tint 금지).
 */
function DocSkeleton({ mobile = false }: { mobile?: boolean }): ReactNode {
  return (
    <div className="flex w-full flex-col gap-4" aria-hidden>
      {/* 제목(h1) 자리 */}
      <div
        className={cn("animate-pulse rounded-sm bg-input", mobile ? "h-7 w-3/5" : "h-9 w-1/2")}
      />
      {/* 메타(path · branch) 자리 */}
      <div
        className={cn("animate-pulse rounded-[6px] bg-input", mobile ? "h-3 w-2/5" : "h-3.5 w-1/3")}
      />
      <div className="h-px w-full shrink-0 bg-hairline" />
      {/* 본문 단락 자리 */}
      <div className="flex w-full flex-col gap-2.5">
        {["w-full", "w-full", "w-4/5"].map((width, i) => (
          <div
            key={`doc-skeleton-line-a-${i.toString()}`}
            className={cn("h-4 animate-pulse rounded-[6px] bg-input", width)}
          />
        ))}
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {["w-full", "w-11/12", "w-3/4"].map((width, i) => (
          <div
            key={`doc-skeleton-line-b-${i.toString()}`}
            className={cn("h-4 animate-pulse rounded-[6px] bg-input", width)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * DESIGN.md §14 Error(network/system): SF 헤드라인 + 원인 1문장 + 복구 CTA 1개.
 * SpecsPage DesktopErrorState 패턴을 Doc Sheet 안에 맞춰 중앙 정렬로 렌더한다.
 */
function DocErrorState({
  message,
  onRetry,
  mobile = false,
}: {
  message: string
  onRetry: () => void
  mobile?: boolean
}): ReactNode {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 py-10">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <AlertTriangle className="size-6 text-danger" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span
          className={cn(
            "pen-text font-semibold tracking-[-0.24px] text-ink",
            mobile ? "text-[14px]" : "text-[15px]",
          )}
        >
          문서를 불러오지 못했습니다
        </span>
        <span className="pen-text max-w-[420px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {message}
        </span>
      </div>
      <ButtonSecondary onClick={onRetry}>
        <RefreshCw className="size-[18px] text-ink" />
        Retry
      </ButtonSecondary>
    </div>
  )
}

/** 마크다운 블록 → 디자인(MgFM9 Doc Sheet) 패턴 렌더 */
function DocBlock({
  block,
  mobile = false,
}: {
  block: MarkdownBlock
  mobile?: boolean
}): ReactNode {
  if (block.kind === "heading") {
    return (
      <h2
        className={cn(
          "pen-text m-0 w-full font-display font-semibold text-ink",
          mobile ? "text-[15.5px] tracking-[-0.24px]" : "text-[19px] tracking-[-0.26px]",
        )}
      >
        {renderInline(block.text)}
      </h2>
    )
  }
  if (block.kind === "paragraph") {
    return (
      <p
        className={cn(
          "pen-text m-0 w-full text-ink-secondary",
          mobile
            ? "text-[13.5px] leading-[1.65] tracking-[-0.2px]"
            : "text-[14.5px] leading-[1.65] tracking-[-0.22px]",
        )}
      >
        {renderInline(block.text)}
      </p>
    )
  }
  if (block.kind === "bullets") {
    const bulletKey = lineKeyer("bullet")
    return (
      <div className="flex w-full flex-col gap-2.5">
        {block.items.map((item) => (
          <Bullet key={bulletKey(item)} text={item} mobile={mobile} />
        ))}
      </div>
    )
  }
  if (block.kind === "ordered") {
    const orderedKey = lineKeyer("ordered")
    return (
      <ol className="flex w-full list-none flex-col gap-2.5">
        {block.items.map((item, index) => (
          <li
            key={orderedKey(item)}
            className={cn("flex w-full", mobile ? "gap-[9px]" : "gap-2.5")}
          >
            <span
              className={cn(
                "pen-text shrink-0 font-medium text-ink-tertiary tabular-nums",
                mobile ? "text-[13px] leading-[1.55]" : "text-[14.5px] leading-[1.6]",
              )}
            >
              {index + 1}.
            </span>
            <span
              className={cn(
                "pen-text w-full text-ink-secondary",
                mobile
                  ? "text-[13px] leading-[1.55] tracking-[-0.2px]"
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
    const quoteKey = lineKeyer("quote")
    return (
      <blockquote
        className={cn(
          "flex w-full flex-col gap-1.5 border-accent/40 border-l-2",
          mobile ? "pl-3" : "pl-4",
        )}
      >
        {block.lines.map((line) => (
          <span
            key={quoteKey(line)}
            className={cn(
              "pen-text w-full text-ink-tertiary italic",
              mobile ? "text-[13px] leading-[1.6]" : "text-[14px] leading-[1.65]",
            )}
          >
            {renderInline(line)}
          </span>
        ))}
      </blockquote>
    )
  }
  if (block.kind === "table") {
    const headerKey = lineKeyer("th")
    const rowKey = lineKeyer("tr")
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th
                  key={headerKey(header)}
                  className={cn(
                    "border border-separator bg-input pen-text font-semibold text-ink",
                    mobile ? "px-2.5 py-1.5 text-[12.5px]" : "px-3.5 py-2 text-[13.5px]",
                  )}
                >
                  {renderInline(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => {
              const cellKey = lineKeyer("td")
              return (
                <tr key={rowKey(row.join("|"))}>
                  {row.map((cell) => (
                    <td
                      key={cellKey(cell)}
                      className={cn(
                        "border border-separator pen-text align-top text-ink-secondary",
                        mobile ? "px-2.5 py-1.5 text-[12.5px]" : "px-3.5 py-2 text-[13.5px]",
                      )}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
  if (block.kind === "hr") {
    return <hr className="w-full border-0 border-separator border-t" />
  }
  // code
  const codeKey = lineKeyer("code")
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-sm bg-dark-card",
        mobile ? "gap-0.5 px-[13px] py-[11px]" : "gap-[3px] px-[18px] py-3.5",
      )}
    >
      {block.lines.map((line) => (
        <code
          key={codeKey(line)}
          className={cn(
            "pen-text font-mono leading-[1.6] whitespace-pre text-white-secondary",
            mobile ? "text-[10.5px]" : "text-[12px]",
          )}
        >
          {line.length === 0 ? " " : line}
        </code>
      ))}
    </div>
  )
}

function Bullet({ text, mobile }: { text: string; mobile: boolean }) {
  return (
    <div className={cn("flex w-full", mobile ? "gap-[9px]" : "gap-2.5")}>
      <span className={mobile ? "pt-[7px]" : "pt-2"}>
        <span
          className={cn(
            "block rounded-full bg-ink-tertiary",
            mobile ? "size-[4.5px]" : "size-[5px]",
          )}
        />
      </span>
      <span
        className={cn(
          "pen-text w-full text-ink-secondary",
          mobile
            ? "text-[13px] leading-[1.55] tracking-[-0.2px]"
            : "text-[14.5px] leading-[1.6] tracking-[-0.22px]",
        )}
      >
        {renderInline(text)}
      </span>
    </div>
  )
}

function RecentIngest({
  initials,
  name,
  time,
  desc,
}: {
  initials: string
  name: string
  time: string
  desc: string
}) {
  return (
    <div className="flex w-full gap-[9px]">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[11px] bg-input">
        <span className="pen-text text-[8.5px] font-semibold text-ink-secondary">{initials}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="pen-text truncate text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
            {name}
          </span>
          <span className="pen-text shrink-0 text-[11px] tracking-[-0.1px] text-ink-tertiary">
            {time}
          </span>
        </span>
        <span className="pen-text w-full text-[12px] leading-[1.45] tracking-[-0.12px] text-ink-tertiary">
          {desc}
        </span>
      </div>
    </div>
  )
}

export function actorInitials(name: string): string {
  const source = name.trim()
  if (source.length === 0) {
    return "SP"
  }
  // 한글 이름은 앞 1자, 영문/그 외는 앞 2자 대문자
  const ascii = /^[\x20-\x7E]+$/u.test(source)
  return ascii ? source.slice(0, 2).toUpperCase() : source.slice(0, 1)
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return iso
  }
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) {
    return "방금"
  }
  if (minutes < 60) {
    return `${minutes}분 전`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}시간 전`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return "어제"
  }
  return `${days}일 전`
}
