import type { IngestLog, WikiGraphResponse, WikiPageResponse } from "@specraft/shared"
import { ChevronLeft, CornerDownRight, FileText, History, Lock } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { IconButton } from "../components/IconButton.js"
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

  useEffect(() => {
    let active = true
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
  }, [client, selectedBranch, path])

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
            {/* Wiki Tree */}
            <nav className="flex w-[230px] shrink-0 flex-col gap-px overflow-y-auto">
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
                          "flex h-[30px] w-full items-center gap-[7px] rounded-[6px] px-2.5 text-left",
                          docActive && "bg-surface",
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
              <h1 className="pen-text m-0 w-full font-display text-[28px] leading-[1.15] font-semibold tracking-[-0.4px] text-ink">
                {title}
              </h1>
              <span className="pen-text w-full text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                {path} · {selectedBranch}
              </span>
              <div className="h-px w-full shrink-0 bg-hairline" />
              {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
              {body.map((entry) => (
                <DocBlock key={entry.key} block={entry.block} />
              ))}
            </article>
            {/* Doc Rail */}
            <aside className="flex w-[248px] shrink-0 flex-col gap-3.5 overflow-y-auto pt-2 pl-1">
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
            <h1 className="pen-text m-0 w-full font-display text-[21px] leading-[1.2] font-semibold tracking-[-0.32px] text-ink">
              {title}
            </h1>
            <span className="pen-text w-full text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              {path}
            </span>
            <div className="h-px w-full shrink-0 bg-hairline" />
            {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
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
          </article>
        </div>
      </div>
    </>
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
        {block.text}
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
        {block.text}
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
        {text}
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
