import {
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Key,
  LogOut,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { useState } from "react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/AppShell.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"

type LogRow = {
  type: "Ingest" | "Query"
  member: string
  initials: string
  branch: string
  summary: string
  mobileSummary?: string
  commit: string
  status: "accepted" | "logged" | "rejected"
  time: string
}

const LOG_ROWS: LogRow[] = [
  { type: "Ingest", member: "수연", initials: "SY", branch: "dev", summary: "Stop 게이트 면제 조건 D9 반영", commit: "a1b2c3d", status: "accepted", time: "2시간 전" },
  { type: "Query", member: "민지", initials: "MJ", branch: "dev", summary: "Stop 게이트 차단 조건 질의", commit: "—", status: "logged", time: "3시간 전" },
  { type: "Ingest", member: "동규", initials: "DK", branch: "feat/query-cache", summary: "쿼리 캐시 spec 초안 — 미push 커밋(P2)", mobileSummary: "쿼리 캐시 spec 초안 — P2 거부", commit: "9f3e21b", status: "rejected", time: "5시간 전" },
  { type: "Query", member: "수연", initials: "SY", branch: "dev", summary: "ingest 순서 보장 P1 규칙", commit: "—", status: "logged", time: "어제" },
  { type: "Ingest", member: "민지", initials: "MJ", branch: "dev", summary: "쿼리 엔진 인용 포맷 정리", commit: "7d21f0a", status: "accepted", time: "어제" },
  { type: "Ingest", member: "수연", initials: "SY", branch: "feat/stop-gate", summary: "게이트 매트릭스 초안", commit: "3c9b771", status: "accepted", time: "2일 전" },
  { type: "Query", member: "동규", initials: "DK", branch: "dev", summary: "wiki 골격 3파일 역할", commit: "—", status: "logged", time: "2일 전" },
  { type: "Ingest", member: "동규", initials: "DK", branch: "dev", summary: "llm-engine 도구 루프 정리", commit: "e8a4c52", status: "accepted", time: "3일 전" },
  { type: "Query", member: "민지", initials: "MJ", branch: "feat/query-cache", summary: "branch lock 해제 절차", commit: "—", status: "logged", time: "3일 전" },
  { type: "Ingest", member: "민지", initials: "MJ", branch: "dev", summary: "specraft-init 초기 대량 ingest", commit: "1a0f9e3", status: "accepted", time: "5일 전" },
]

const STATUS_DOT: Record<LogRow["status"], string> = {
  accepted: "bg-success",
  logged: "bg-separator",
  rejected: "bg-danger",
}

type TypeTab = "All" | "Ingests" | "Queries"

/** 07 · Activity (1440, Profile Menu 포함) + M07 (390) */
export function ActivityScreen() {
  const [filter, setFilter] = useState<TypeTab>("All")
  const [profileOpen, setProfileOpen] = useState(true)

  const visibleRows = LOG_ROWS.filter((row) => {
    if (filter === "Ingests") return row.type === "Ingest"
    if (filter === "Queries") return row.type === "Query"
    return true
  })

  return (
    <>
      {/* ───── 데스크톱 07 ───── */}
      <div className="hidden h-full md:block">
        <AppShell
          active="activity"
          onAvatarClick={() => setProfileOpen((o) => !o)}
          topNavOverlay={
            profileOpen ? (
              <div className="absolute top-[54px] right-[28px] z-50 flex w-[236px] flex-col gap-0.5 rounded-m bg-surface p-1.5 shadow-[3px_5px_30px_#00000038]">
                <div className="flex w-full flex-col gap-0.5 px-2.5 py-2">
                  <span className="pen-text text-[13px] font-semibold tracking-[-0.2px] text-ink">
                    수연
                  </span>
                  <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                    senna@prompt.town
                  </span>
                </div>
                <div className="h-px w-full bg-hairline" />
                <Link
                  to="/settings/git"
                  className="flex h-8 w-full items-center gap-[9px] rounded-[7px] bg-bg px-2.5"
                >
                  <SlidersHorizontal className="size-3.5 text-ink-secondary" />
                  <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Settings</span>
                </Link>
                <Link
                  to="/settings/keys"
                  className="flex h-8 w-full items-center gap-[9px] rounded-[7px] px-2.5"
                >
                  <Key className="size-3.5 text-ink-secondary" />
                  <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">API keys</span>
                </Link>
                <div className="h-px w-full bg-hairline" />
                <Link
                  to="/signin"
                  className="flex h-8 w-full items-center gap-[9px] rounded-[7px] px-2.5"
                >
                  <LogOut className="size-3.5 text-ink-secondary" />
                  <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Sign out</span>
                </Link>
              </div>
            ) : null
          }
        >
          <div className="flex w-full items-center gap-3.5 px-7 py-[18px]">
            <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px] text-ink">
              Activity
            </h1>
            <span className="h-px flex-1" />
            <TypeFilter filter={filter} onChange={setFilter} />
            <button
              type="button"
              className="flex items-center gap-[7px] rounded-pill bg-surface px-[13px] py-[7px]"
            >
              <Calendar className="size-[13px] text-ink" />
              <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink">
                Last 7 days
              </span>
              <ChevronDown className="size-[13px] text-ink-tertiary" />
            </button>
          </div>
          <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-7 pt-1 pb-7">
            <div className="flex w-full flex-col overflow-hidden rounded-m bg-surface">
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
              {visibleRows.map((row, i) => (
                <div
                  key={`${row.commit}-${row.summary}`}
                  className={cn(
                    "flex h-[46px] w-full shrink-0 items-center gap-3.5 px-5",
                    i < visibleRows.length - 1 && "border-b border-hairline",
                  )}
                >
                  <span className="flex w-24 shrink-0 items-center gap-[7px]">
                    <span
                      className={cn(
                        "flex size-[22px] items-center justify-center rounded-[6px]",
                        row.type === "Ingest" ? "bg-dark-card" : "bg-input",
                      )}
                    >
                      {row.type === "Ingest" ? (
                        <ArrowUp className="size-3 text-white" />
                      ) : (
                        <MessageCircle className="size-3 text-ink-secondary" />
                      )}
                    </span>
                    <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink-secondary">
                      {row.type}
                    </span>
                  </span>
                  <span className="flex w-[130px] shrink-0 items-center gap-[7px]">
                    <span className="flex size-5 items-center justify-center rounded-[10px] bg-input">
                      <span className="pen-text text-[8px] font-semibold text-ink-secondary">
                        {row.initials}
                      </span>
                    </span>
                    <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">
                      {row.member}
                    </span>
                  </span>
                  <span className="flex w-[170px] shrink-0 items-center">
                    <span className="flex items-center gap-[5px] rounded-[5px] bg-input px-2 py-[3px]">
                      <GitBranchIcon className="size-2.5 text-ink-tertiary" />
                      <span className="pen-text font-mono text-[11px] text-ink-secondary">
                        {row.branch}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="pen-text text-[13px] tracking-[-0.2px] whitespace-nowrap text-ink-secondary">
                      {row.summary}
                    </span>
                  </span>
                  <span className="flex w-[84px] shrink-0 items-center">
                    <span
                      className={cn(
                        "pen-text font-mono text-[11px]",
                        row.commit === "—" ? "text-ink-tertiary" : "text-ink-secondary",
                      )}
                    >
                      {row.commit}
                    </span>
                  </span>
                  <span className="flex w-[104px] shrink-0 items-center gap-1.5">
                    <span className={cn("size-[7px] rounded-full", STATUS_DOT[row.status])} />
                    <span
                      className={cn(
                        "pen-text text-[12px] font-medium tracking-[-0.12px]",
                        row.status === "rejected" ? "text-danger" : "text-ink-secondary",
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                  <span className="flex w-[84px] shrink-0 items-center">
                    <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                      {row.time}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex w-full items-center px-1">
              <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
                Showing 10 of 248
              </span>
              <span className="h-px flex-1" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex size-[26px] items-center justify-center rounded-[7px]"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="size-[13px] text-separator" />
                </button>
                <button
                  type="button"
                  className="flex size-[26px] items-center justify-center rounded-[7px] bg-surface"
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="size-[13px] text-ink-secondary" />
                </button>
              </div>
            </div>
          </div>
        </AppShell>
      </div>

      {/* ───── 모바일 M07 ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 py-2">
          <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
            Activity
          </h1>
          <span className="h-px flex-1" />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-pill bg-surface px-[11px] py-1.5"
          >
            <Calendar className="size-3 text-ink" />
            <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
              7 days
            </span>
          </button>
        </div>
        <div className="w-full px-4 pt-1 pb-2.5">
          <div className="flex w-full gap-0.5 rounded-[9px] bg-input p-0.5">
            {(["All", "Ingests", "Queries"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
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
          <div className="flex w-full flex-col overflow-hidden rounded-m bg-surface">
            {visibleRows.slice(0, 9).map((row, i, arr) => (
              <div
                key={`${row.commit}-${row.summary}`}
                className={cn(
                  "flex h-14 w-full shrink-0 items-center gap-[11px] px-3.5",
                  i < arr.length - 1 && "border-b border-hairline",
                )}
              >
                <span
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-s",
                    row.type === "Ingest" ? "bg-dark-card" : "bg-input",
                  )}
                >
                  {row.type === "Ingest" ? (
                    <ArrowUp className="size-3 text-white" />
                  ) : (
                    <MessageCircle className="size-3 text-ink-secondary" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  <span className="pen-text truncate text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                    {row.member} · {row.type}
                  </span>
                  <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                    {row.mobileSummary ?? row.summary}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-[3px]">
                  <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                    {row.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={cn("size-1.5 rounded-full", STATUS_DOT[row.status])} />
                    <span
                      className={cn(
                        "pen-text text-[10px] font-medium tracking-[-0.1px]",
                        row.status === "rejected" ? "text-danger" : "text-ink-secondary",
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                </span>
              </div>
            ))}
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

function TypeFilter({
  filter,
  onChange,
}: {
  filter: TypeTab
  onChange: (tab: TypeTab) => void
}) {
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
