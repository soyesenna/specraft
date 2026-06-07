import type { IngestLog, QueryLog } from "@specraft/shared"
import {
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

type ActivityRow =
  | { readonly kind: "Ingest"; readonly log: IngestLog }
  | { readonly kind: "Query"; readonly log: QueryLog }

type ActivityStatus = "accepted" | "logged" | "rejected"

type TypeTab = "All" | "Ingests" | "Queries"

const PAGE_SIZE = 10

const STATUS_DOT: Record<ActivityStatus, string> = {
  accepted: "bg-success",
  logged: "bg-separator",
  rejected: "bg-danger",
}

function rowKey(row: ActivityRow): string {
  return `${row.kind}-${row.log.id}`
}

function rowSummary(row: ActivityRow): string {
  return row.kind === "Ingest" ? row.log.summary : row.log.question
}

function rowStatus(row: ActivityRow): ActivityStatus {
  return row.kind === "Ingest" ? row.log.status : "logged"
}

function rowCommit(row: ActivityRow): string {
  return row.kind === "Ingest" ? row.log.commit_hash.slice(0, 7) : "—"
}

function rowMillis(row: ActivityRow): number {
  const parsed = Date.parse(row.log.created_at)
  return Number.isNaN(parsed) ? 0 : parsed
}

function memberInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function relativeTime(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) {
    return iso
  }
  const diffSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000))
  if (diffSeconds < 60) {
    return "방금 전"
  }
  const minutes = Math.round(diffSeconds / 60)
  if (minutes < 60) {
    return `${minutes}분 전`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}시간 전`
  }
  const days = Math.round(hours / 24)
  if (days === 1) {
    return "어제"
  }
  if (days < 7) {
    return `${days}일 전`
  }
  const weeks = Math.round(days / 7)
  return `${weeks}주 전`
}

export function ActivityPage() {
  const { client } = useSpecraft()
  const [rows, setRows] = useState<readonly ActivityRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TypeTab>("All")
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    void Promise.all([client.listIngestLogs(), client.listQueryLogs()])
      .then(([ingests, queries]) => {
        if (!active) {
          return
        }
        const nextRows: readonly ActivityRow[] = [
          ...ingests.logs.map((log) => ({ kind: "Ingest", log }) as const),
          ...queries.logs.map((log) => ({ kind: "Query", log }) as const),
        ]
          .slice()
          .sort((a, b) => rowMillis(b) - rowMillis(a))
        setRows(nextRows)
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load activity")
        }
      })
    return () => {
      active = false
    }
  }, [client])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === "Ingests") return row.kind === "Ingest"
        if (filter === "Queries") return row.kind === "Query"
        return true
      }),
    [rows, filter],
  )

  const totalCount = filteredRows.length
  const pageStart = page * PAGE_SIZE
  const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE)
  const hasPrev = page > 0
  const hasNext = pageStart + PAGE_SIZE < totalCount
  const shownCount = pageRows.length

  const setFilterReset = (tab: TypeTab) => {
    setFilter(tab)
    setPage(0)
  }

  return (
    <>
      {/* ───── 데스크톱 07 ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title="Activity"
          titleMeta={null}
          titleRight={
            <div className="flex items-center gap-3.5">
              <TypeFilter filter={filter} onChange={setFilterReset} />
              <div className="flex items-center gap-[7px] rounded-pill bg-surface px-[13px] py-[7px]">
                <Calendar className="size-[13px] text-ink" />
                <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink">
                  Last 7 days
                </span>
                <ChevronDown className="size-[13px] text-ink-tertiary" />
              </div>
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-7 pt-1 pb-7">
            {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
            <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
              <div className="flex h-[38px] w-full shrink-0 items-center gap-3.5 border-b border-hairline px-5">
                <HeadCell w={96}>TYPE</HeadCell>
                <HeadCell w={130}>MEMBER</HeadCell>
                <HeadCell w={170}>BRANCH</HeadCell>
                <span className="min-w-0 flex-1">
                  <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
                    SUMMARY
                  </span>
                </span>
                <HeadCell w={84}>COMMIT</HeadCell>
                <HeadCell w={104}>STATUS</HeadCell>
                <HeadCell w={84}>TIME</HeadCell>
              </div>
              {pageRows.map((row, i) => {
                const status = rowStatus(row)
                const commit = rowCommit(row)
                return (
                  <div
                    key={rowKey(row)}
                    className={cn(
                      "flex h-[46px] w-full shrink-0 items-center gap-3.5 px-5",
                      i < pageRows.length - 1 && "border-b border-hairline",
                    )}
                  >
                    <span className="flex w-24 shrink-0 items-center gap-[7px]">
                      <span
                        className={cn(
                          "flex size-[22px] items-center justify-center rounded-[6px]",
                          row.kind === "Ingest" ? "bg-dark-card" : "bg-input",
                        )}
                      >
                        {row.kind === "Ingest" ? (
                          <ArrowUp className="size-3 text-white" />
                        ) : (
                          <MessageCircle className="size-3 text-ink-secondary" />
                        )}
                      </span>
                      <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink-secondary">
                        {row.kind}
                      </span>
                    </span>
                    <span className="flex w-[130px] shrink-0 items-center gap-[7px]">
                      <span className="flex size-5 items-center justify-center rounded-[10px] bg-input">
                        <span className="pen-text text-[8px] font-semibold text-ink-secondary">
                          {memberInitials(row.log.member.name)}
                        </span>
                      </span>
                      <span className="pen-text truncate text-[13px] tracking-[-0.2px] text-ink">
                        {row.log.member.name}
                      </span>
                    </span>
                    <span className="flex w-[170px] shrink-0 items-center">
                      <span className="flex items-center gap-[5px] rounded-[5px] bg-input px-2 py-[3px]">
                        <GitBranchIcon className="size-2.5 text-ink-tertiary" />
                        <span className="pen-text truncate font-mono text-[11px] text-ink-secondary">
                          {row.log.branch}
                        </span>
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-secondary">
                        {rowSummary(row)}
                      </span>
                    </span>
                    <span className="flex w-[84px] shrink-0 items-center">
                      <span
                        className={cn(
                          "pen-text font-mono text-[11px]",
                          commit === "—" ? "text-ink-tertiary" : "text-ink-secondary",
                        )}
                      >
                        {commit}
                      </span>
                    </span>
                    <span className="flex w-[104px] shrink-0 items-center gap-1.5">
                      <span className={cn("size-[7px] rounded-full", STATUS_DOT[status])} />
                      <span
                        className={cn(
                          "pen-text text-[12px] font-medium tracking-[-0.12px]",
                          status === "rejected" ? "text-danger" : "text-ink-secondary",
                        )}
                      >
                        {status}
                      </span>
                    </span>
                    <span className="flex w-[84px] shrink-0 items-center">
                      <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                        {relativeTime(row.log.created_at)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex w-full items-center px-1">
              <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
                Showing {shownCount} of {totalCount}
              </span>
              <span className="h-px flex-1" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className={cn(
                    "flex size-[26px] items-center justify-center rounded-[7px]",
                    hasPrev && "bg-surface",
                  )}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft
                    className={cn("size-[13px]", hasPrev ? "text-ink-secondary" : "text-separator")}
                  />
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => setPage((current) => current + 1)}
                  className={cn(
                    "flex size-[26px] items-center justify-center rounded-[7px]",
                    hasNext && "bg-surface",
                  )}
                  aria-label="다음 페이지"
                >
                  <ChevronRight
                    className={cn("size-[13px]", hasNext ? "text-ink-secondary" : "text-separator")}
                  />
                </button>
              </div>
            </div>
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M07 ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 py-2">
          <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
            Activity
          </h1>
          <span className="h-px flex-1" />
          <div className="flex items-center gap-1.5 rounded-pill bg-surface px-[11px] py-1.5">
            <Calendar className="size-3 text-ink" />
            <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
              7 days
            </span>
          </div>
        </div>
        <div className="w-full px-4 pt-1 pb-2.5">
          <div className="flex w-full gap-0.5 rounded-[9px] bg-input p-0.5">
            {(["All", "Ingests", "Queries"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterReset(tab)}
                className={cn(
                  "flex h-[30px] min-w-0 flex-1 items-center justify-center rounded-[7px]",
                  filter === tab && "bg-surface shadow-[0_1px_3px_#0000001F]",
                )}
              >
                <span
                  className={cn(
                    "pen-text text-[12.5px] font-medium tracking-[-0.12px]",
                    filter === tab ? "text-ink" : "text-ink-tertiary",
                  )}
                >
                  {tab}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-0.5 pb-3">
          {error && <span className="pen-text px-1 pb-2 text-[12px] text-danger">{error}</span>}
          <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
            {pageRows.map((row, i) => {
              const status = rowStatus(row)
              return (
                <div
                  key={rowKey(row)}
                  className={cn(
                    "flex h-14 w-full shrink-0 items-center gap-[11px] px-3.5",
                    i < pageRows.length - 1 && "border-b border-hairline",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[26px] shrink-0 items-center justify-center rounded-sm",
                      row.kind === "Ingest" ? "bg-dark-card" : "bg-input",
                    )}
                  >
                    {row.kind === "Ingest" ? (
                      <ArrowUp className="size-3 text-white" />
                    ) : (
                      <MessageCircle className="size-3 text-ink-secondary" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="pen-text truncate text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                      {row.log.member.name} · {row.kind}
                    </span>
                    <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                      {rowSummary(row)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-[3px]">
                    <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                      {relativeTime(row.log.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
                      <span
                        className={cn(
                          "pen-text text-[10px] font-medium tracking-[-0.1px]",
                          status === "rejected" ? "text-danger" : "text-ink-secondary",
                        )}
                      >
                        {status}
                      </span>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <MobileTabBar active="spec" />
        <GlassNav active="activity" className="absolute bottom-[88px] left-4 z-20" />
      </div>
    </>
  )
}

function HeadCell({ w, children }: { w: number; children: string }) {
  return (
    <span style={{ width: w }} className="shrink-0">
      <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
        {children}
      </span>
    </span>
  )
}

function TypeFilter({ filter, onChange }: { filter: TypeTab; onChange: (tab: TypeTab) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-[9px] bg-input p-0.5">
      {(["All", "Ingests", "Queries"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex items-center justify-center rounded-[7px] px-3 py-[5px]",
            filter === tab && "bg-surface shadow-[0_1px_3px_#0000001F]",
          )}
        >
          <span
            className={cn(
              "pen-text text-[12.5px] font-medium tracking-[-0.12px]",
              filter === tab ? "text-ink" : "text-ink-tertiary",
            )}
          >
            {tab}
          </span>
        </button>
      ))}
    </div>
  )
}
