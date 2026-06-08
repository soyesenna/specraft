import type { IngestLog, QueryLog } from "@specraft/shared"
import {
  AlertTriangle,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ButtonSecondary } from "../components/buttons.js"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"
import { useDismissable } from "../lib/useDismissable.js"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"

type ActivityRow =
  | { readonly kind: "Ingest"; readonly log: IngestLog }
  | { readonly kind: "Query"; readonly log: QueryLog }

type ActivityStatus = "accepted" | "logged" | "rejected"

type TypeTab = "All" | "Ingests" | "Queries"

const PAGE_SIZE = 10

/** 기간 필터 — created_at 기준 상대 범위. 기본 7d. */
type Period = "today" | "7d" | "30d" | "90d" | "all"

const PERIODS: readonly Period[] = ["today", "7d", "30d", "90d", "all"]

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

const PERIOD_SHORT: Record<Period, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All",
}

const DAY_MS = 86_400_000

/** 선택 기간의 시작 시각(ms). all=0(전체), today=로컬 자정 기준. */
function periodCutoff(period: Period): number {
  if (period === "all") {
    return 0
  }
  if (period === "today") {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  return Date.now() - days * DAY_MS
}

const STATUS_DOT: Record<ActivityStatus, string> = {
  accepted: "bg-success",
  logged: "bg-separator",
  rejected: "bg-danger",
}

function rowKey(row: ActivityRow): string {
  return `${row.kind}-${row.log.id}`
}

/** 행 → 상세 라우트 (/activity/ingest/:id | /activity/query/:id) */
function rowHref(row: ActivityRow): string {
  return `/activity/${row.kind === "Ingest" ? "ingest" : "query"}/${row.log.id}`
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
  const navigate = useNavigate()
  const [rows, setRows] = useState<readonly ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TypeTab>("All")
  const [period, setPeriod] = useState<Period>("7d")
  const [page, setPage] = useState(0)

  // 액티비티 로드를 재호출 가능한 함수로 분리 — Retry 버튼이 같은 경로를 다시 태운다.
  // active 가드는 호출자(useEffect cleanup / 버튼 핸들러)가 넘긴 ref로 stale 응답을 차단.
  const loadActivity = useCallback(
    (isActive: () => boolean) => {
      setRows(null)
      setError(null)
      void Promise.all([client.listIngestLogs(), client.listQueryLogs()])
        .then(([ingests, queries]) => {
          if (!isActive()) {
            return
          }
          const nextRows: readonly ActivityRow[] = [
            ...ingests.logs.map((log) => ({ kind: "Ingest", log }) as const),
            ...queries.logs.map((log) => ({ kind: "Query", log }) as const),
          ]
            .slice()
            .sort((a, b) => rowMillis(b) - rowMillis(a))
          setRows(nextRows)
          setError(null)
        })
        .catch((caught: unknown) => {
          if (isActive()) {
            setError(caught instanceof Error ? caught.message : "Failed to load activity")
          }
        })
    },
    [client],
  )

  useEffect(() => {
    let active = true
    loadActivity(() => active)
    return () => {
      active = false
    }
  }, [loadActivity])

  const retryActivity = () => {
    loadActivity(() => true)
  }

  const filteredRows = useMemo(() => {
    const cutoff = periodCutoff(period)
    return (rows ?? []).filter((row) => {
      if (filter === "Ingests" && row.kind !== "Ingest") return false
      if (filter === "Queries" && row.kind !== "Query") return false
      return rowMillis(row) >= cutoff
    })
  }, [rows, filter, period])

  // 로딩: rows 미도착 && 에러 없음. 데이터 0건과 로딩 중을 명확히 구분한다.
  const loading = rows === null && error === null
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

  const setPeriodReset = (next: Period) => {
    setPeriod(next)
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
              <PeriodFilter period={period} onChange={setPeriodReset} />
            </div>
          }
        >
          {error ? (
            <DesktopErrorState message={error} onRetry={retryActivity} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-7 pt-1 pb-7">
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
                {loading && <DesktopRowSkeleton />}
                {!loading &&
                  pageRows.map((row, i) => {
                    const status = rowStatus(row)
                    const commit = rowCommit(row)
                    return (
                      <button
                        type="button"
                        key={rowKey(row)}
                        onClick={() => navigate(rowHref(row))}
                        className={cn(
                          "group flex h-[46px] w-full shrink-0 cursor-pointer items-center gap-3.5 px-5 text-left transition-colors duration-150 ease-[var(--ease-standard)] hover:bg-bg",
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
                        <span className="flex w-[170px] shrink-0 items-center overflow-hidden">
                          <span className="flex min-w-0 max-w-full items-center gap-[5px] rounded-[5px] bg-input px-2 py-[3px]">
                            <GitBranchIcon className="size-2.5 text-ink-tertiary" />
                            <span className="pen-text truncate font-mono text-[11px] text-ink-secondary">
                              {row.log.branch}
                            </span>
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 overflow-hidden">
                          <span className="pen-text truncate text-[13px] tracking-[-0.2px] text-ink-secondary">
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
                        <span className="flex w-[84px] shrink-0 items-center justify-between gap-1.5">
                          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                            {relativeTime(row.log.created_at)}
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-ink-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                        </span>
                      </button>
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
                      "flex size-[26px] items-center justify-center rounded-[7px] transition-[background-color,filter] duration-150 ease-[var(--ease-standard)]",
                      hasPrev && "bg-surface hover:brightness-95",
                    )}
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft
                      className={cn(
                        "size-[13px]",
                        hasPrev ? "text-ink-secondary" : "text-separator",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => setPage((current) => current + 1)}
                    className={cn(
                      "flex size-[26px] items-center justify-center rounded-[7px] transition-[background-color,filter] duration-150 ease-[var(--ease-standard)]",
                      hasNext && "bg-surface hover:brightness-95",
                    )}
                    aria-label="다음 페이지"
                  >
                    <ChevronRight
                      className={cn(
                        "size-[13px]",
                        hasNext ? "text-ink-secondary" : "text-separator",
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
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
          <PeriodFilter period={period} onChange={setPeriodReset} mobile />
        </div>
        <div className="w-full px-4 pt-1 pb-2.5">
          <div className="flex w-full gap-0.5 rounded-[9px] bg-input p-0.5">
            {(["All", "Ingests", "Queries"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterReset(tab)}
                aria-pressed={filter === tab}
                className={cn(
                  "flex h-[30px] min-w-0 flex-1 items-center justify-center rounded-[7px]",
                  "transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
                  filter === tab ? "bg-surface shadow-[0_1px_3px_#0000001F]" : "hover:bg-hairline",
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
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-0.5 pb-[150px]">
          {error ? (
            <MobileErrorState message={error} onRetry={retryActivity} />
          ) : (
            <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
              {loading && <MobileRowSkeleton />}
              {!loading &&
                pageRows.map((row, i) => {
                  const status = rowStatus(row)
                  return (
                    <button
                      type="button"
                      key={rowKey(row)}
                      onClick={() => navigate(rowHref(row))}
                      className={cn(
                        "flex h-14 w-full shrink-0 items-center gap-[11px] px-3.5 text-left transition-colors duration-150 ease-[var(--ease-standard)] active:bg-bg",
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
                      <ChevronRight className="size-4 shrink-0 text-separator" />
                    </button>
                  )
                })}
            </div>
          )}
        </div>
        <MobileTabBar active="spec" />
        <GlassNav active="activity" className="absolute inset-x-4 bottom-[88px] z-20" />
      </div>
    </>
  )
}

/**
 * DESIGN.md §14 Error(network/system): SF 헤드라인 + 원인 1문장 + 복구 CTA 1개.
 * SpecsPage.DesktopErrorState와 동일 톤(아이콘 카드+제목+원인+Retry), Retry는 fetch 재호출.
 */
function DesktopErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 px-7 pb-7">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <AlertTriangle className="size-6 text-danger" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
          액티비티를 불러오지 못했습니다
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

/**
 * DESIGN.md §14 Skeleton: 최종 콘텐츠와 동일한 radius·치수의 bg(#f5f5f7) 블록.
 * shimmer는 더 밝은 회색(animate-pulse), blue-tint 금지. 테이블 행(h-[46px]) 치수를 보존.
 */
function DesktopRowSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`activity-skeleton-row-${i.toString()}`}
          className="flex h-[46px] w-full shrink-0 items-center gap-3.5 px-5 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-hairline"
        >
          <span className="flex w-24 shrink-0 items-center gap-[7px]">
            <span className="size-[22px] animate-pulse rounded-[6px] bg-bg" />
            <span className="h-[11px] w-12 animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex w-[130px] shrink-0 items-center gap-[7px]">
            <span className="size-5 animate-pulse rounded-[10px] bg-bg" />
            <span className="h-[11px] w-[72px] animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex w-[170px] shrink-0">
            <span className="h-[19px] w-[120px] animate-pulse rounded-[5px] bg-bg" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block h-[11px] w-[70%] animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex w-[84px] shrink-0">
            <span className="h-[11px] w-12 animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex w-[104px] shrink-0">
            <span className="h-[11px] w-16 animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex w-[84px] shrink-0">
            <span className="h-[11px] w-12 animate-pulse rounded-sm bg-bg" />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * DESIGN.md §14 Error(network/system) 모바일 변형 — 데스크톱과 동일한 아이콘 카드+제목+원인+Retry.
 */
function MobileErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
      <span className="flex size-12 items-center justify-center rounded-3xl bg-input">
        <AlertTriangle className="size-5 text-danger" />
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="pen-text text-[14px] font-semibold tracking-[-0.2px] text-ink">
          액티비티를 불러오지 못했습니다
        </span>
        <span className="pen-text max-w-[280px] text-center text-[12px] tracking-[-0.1px] text-ink-tertiary">
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

/**
 * DESIGN.md §14 Skeleton 모바일 변형 — 리스트 행(h-14) 치수를 보존한 animate-pulse 블록.
 */
function MobileRowSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`activity-skeleton-mobile-${i.toString()}`}
          className="flex h-14 w-full shrink-0 items-center gap-[11px] px-3.5 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-hairline"
        >
          <span className="size-[26px] shrink-0 animate-pulse rounded-sm bg-bg" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="h-[11px] w-[44%] animate-pulse rounded-sm bg-bg" />
            <span className="h-[10px] w-[70%] animate-pulse rounded-sm bg-bg" />
          </span>
          <span className="flex shrink-0 flex-col items-end gap-[5px]">
            <span className="h-[9px] w-10 animate-pulse rounded-sm bg-bg" />
            <span className="h-[9px] w-12 animate-pulse rounded-sm bg-bg" />
          </span>
        </div>
      ))}
    </div>
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

/** 기간 필터 드롭다운 — Date Chip 트리거 + 옵션 메뉴(useDismissable로 외부/Esc 닫기). */
function PeriodFilter({
  period,
  onChange,
  mobile = false,
}: {
  period: Period
  onChange: (period: Period) => void
  mobile?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useDismissable(open, () => setOpen(false), anchorRef, buttonRef)
  // 드롭다운 ease-enter 페이드·슬라이드: 열림 직후 다음 프레임에 entered=true.
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [open])
  return (
    <div ref={anchorRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center rounded-pill bg-surface transition-[filter] duration-150 ease-[var(--ease-standard)] hover:brightness-95",
          mobile ? "gap-1.5 px-[11px] py-1.5" : "gap-[7px] px-[13px] py-[7px]",
        )}
      >
        <Calendar className={cn("text-ink", mobile ? "size-3" : "size-[13px]")} />
        <span
          className={cn(
            "pen-text font-medium text-ink",
            mobile ? "text-[12px] tracking-[-0.12px]" : "text-[13px] tracking-[-0.2px]",
          )}
        >
          {mobile ? PERIOD_SHORT[period] : PERIOD_LABELS[period]}
        </span>
        <ChevronDown
          className={cn(
            "text-ink-tertiary transition-transform duration-150",
            mobile ? "size-3" : "size-[13px]",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 z-40 mt-2 flex min-w-[148px] flex-col gap-0.5 rounded-md bg-surface p-1 shadow-[3px_5px_30px_#00000038]",
            "origin-top-right transition duration-150 ease-[cubic-bezier(0.2,0.6,0.25,1)] motion-reduce:transition-none",
            entered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          {PERIODS.map((option) => {
            const active = option === period
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left transition-colors duration-150 ease-[var(--ease-standard)]",
                  active ? "bg-bg" : "hover:bg-hairline",
                )}
              >
                <span
                  className={cn(
                    "pen-text whitespace-nowrap text-[13px] tracking-[-0.2px]",
                    active ? "font-semibold text-ink" : "text-ink-secondary",
                  )}
                >
                  {PERIOD_LABELS[option]}
                </span>
                {active && <Check className="ml-auto size-3.5 shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
          aria-pressed={filter === tab}
          className={cn(
            "flex items-center justify-center rounded-[7px] px-3 py-[5px]",
            "transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
            filter === tab ? "bg-surface shadow-[0_1px_3px_#0000001F]" : "hover:bg-hairline",
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
