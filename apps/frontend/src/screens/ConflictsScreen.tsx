import { ChevronLeft, ChevronRight, FileText, GitMerge, Lock } from "lucide-react"
import { useState } from "react"
import { DirectiveBar } from "../components/DirectiveBar.js"
import { AppShell } from "../components/AppShell.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SelectCard } from "../components/SelectCard.js"
import { cn } from "../lib/cn.js"

type Conflict = {
  id: string
  state: "Open" | "Resolving" | "Resolved"
  time: string
  branch: string
  sub: string
  mobileSub?: string
  resolved?: boolean
}

const CONFLICTS: Conflict[] = [
  { id: "cfl_04a2", state: "Open", time: "26분 전", branch: "feat/query-cache → dev", sub: "specs/query-engine.md 외 1개 파일 · branch locked" },
  { id: "cfl_03f1", state: "Resolving", time: "1시간 전", branch: "feat/auth-keys → dev", sub: "민지의 지시로 재병합 시도 중" },
  { id: "cfl_02b8", state: "Resolved", time: "어제", branch: "feat/stop-gate → dev", sub: "2회 시도 후 해결 · 수연", resolved: true },
]

const STATE_TONE: Record<Conflict["state"], { dot: string; text: string }> = {
  Open: { dot: "bg-danger", text: "text-danger" },
  Resolving: { dot: "bg-warning", text: "text-warning" },
  Resolved: { dot: "bg-success", text: "text-success" },
}

/** 08 · Conflicts + 08b · No selection (1440) / M08 · M08b (390) */
export function ConflictsScreen() {
  const [selected, setSelected] = useState<string | null>("cfl_04a2")
  const [mobileDetail, setMobileDetail] = useState<string | null>(null)

  return (
    <>
      {/* ───── 데스크톱 08/08b ───── */}
      <div className="relative hidden h-full md:block">
        <AppShell active="conflicts">
          <div className="flex w-full items-center gap-3.5 px-7 py-[18px]">
            <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px] text-ink">
              Conflicts
            </h1>
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
              1 open · 1 resolving · 12 resolved
            </span>
          </div>
          <div className="flex min-h-0 w-full flex-1 gap-[22px] px-7 pt-1 pb-7">
            {/* Conflict List */}
            <div className="flex w-[356px] shrink-0 flex-col gap-2.5">
              {CONFLICTS.map((conflict) => {
                const tone = STATE_TONE[conflict.state]
                return (
                  <SelectCard
                    key={conflict.id}
                    selected={selected === conflict.id}
                    onClick={() =>
                      setSelected((cur) => (cur === conflict.id ? null : conflict.id))
                    }
                    className={cn(conflict.resolved && "opacity-[0.72]")}
                  >
                    <div className="flex w-full flex-col gap-[7px] px-px py-px">
                      <div className="flex w-full items-center gap-1.5">
                        <span className={cn("size-[7px] rounded-full", tone.dot)} />
                        <span
                          className={cn(
                            "pen-text text-[11.5px] font-semibold tracking-[-0.1px]",
                            tone.text,
                          )}
                        >
                          {conflict.state}
                        </span>
                        <span className="h-px flex-1" />
                        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                          {conflict.time}
                        </span>
                      </div>
                      <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                        {conflict.branch}
                      </span>
                      <span className="pen-text w-full text-[12px] tracking-[-0.12px] text-ink-tertiary">
                        {conflict.sub}
                      </span>
                    </div>
                  </SelectCard>
                )
              })}
            </div>
            {/* Detail / Empty */}
            {selected ? <DesktopConflictDetail /> : <EmptyPane />}
          </div>
        </AppShell>
        {selected && (
          <div className="absolute bottom-[37px] left-[657px] z-30 w-[720px]">
            <DirectiveBar />
          </div>
        )}
      </div>

      {/* ───── 모바일 M08/M08b ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        {mobileDetail ? (
          <MobileConflictDetail onBack={() => setMobileDetail(null)} />
        ) : (
          <>
            <MobileStatusBar />
            <div className="flex w-full flex-col gap-0.5 px-4 pt-2 pb-2.5">
              <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
                Conflicts
              </h1>
              <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                1 open · 1 resolving · 12 resolved
              </span>
            </div>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-0.5 pb-3">
              {CONFLICTS.map((conflict) => {
                const tone = STATE_TONE[conflict.state]
                return (
                  <SelectCard
                    key={conflict.id}
                    onClick={() => setMobileDetail(conflict.id)}
                    unpadded
                    className={cn("shrink-0", conflict.resolved && "opacity-[0.72]")}
                  >
                    <div className="flex w-full items-center gap-2.5 px-3.5 py-[13px]">
                      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                        <div className="flex w-full items-center gap-1.5">
                          <span className={cn("size-[7px] rounded-full", tone.dot)} />
                          <span
                            className={cn(
                              "pen-text text-[11px] font-semibold tracking-[-0.1px]",
                              tone.text,
                            )}
                          >
                            {conflict.state}
                          </span>
                          <span className="h-px flex-1" />
                          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                            {conflict.time}
                          </span>
                        </div>
                        <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                          {conflict.branch}
                        </span>
                        <span className="pen-text w-full truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                          {conflict.sub}
                        </span>
                      </div>
                      <ChevronRight className="size-[15px] shrink-0 text-separator" />
                    </div>
                  </SelectCard>
                )
              })}
            </div>
            <MobileTabBar active="spec" />
            <GlassNav active="conflicts" className="absolute bottom-[88px] left-4 z-20" />
          </>
        )}
      </div>
    </>
  )
}

function DesktopConflictDetail() {
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-4 self-start rounded-l bg-surface px-[26px] py-[22px]">
      <div className="flex w-full items-center gap-2.5">
        <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px] text-ink">
          feat/query-cache → dev
        </span>
        <span className="flex items-center gap-1.5 rounded-pill bg-bg px-2.5 py-1">
          <span className="size-[7px] rounded-full bg-danger" />
          <span className="pen-text text-[11.5px] font-semibold tracking-[-0.1px] text-danger">
            Open
          </span>
        </span>
        <span className="h-px flex-1" />
        <span className="pen-text font-mono text-[11px] text-ink-tertiary">cfl_04a2</span>
      </div>
      <div className="flex w-full items-center gap-[9px] rounded-s bg-bg px-3.5 py-2.5">
        <Lock className="size-[13px] shrink-0 text-danger" />
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
          이 브랜치의 context · query · ingest 요청은 해제 전까지 409로 거부됩니다 — 다른 브랜치는
          정상 동작합니다.
        </span>
      </div>
      <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
        LLM MERGE FAILURE
      </span>
      <p className="pen-text m-0 w-full text-[13.5px] leading-[1.65] tracking-[-0.2px] text-ink-secondary">
        Merge Agent가 specs/query-engine.md의 '캐싱 정책' 섹션에서 상충하는 두 정의 — dev의 'TTL
        300초'와 feat/query-cache의 '무기한 캐시 + 수동 무효화 API' — 를 의미적으로 병합하지
        못했습니다. 확신이 낮아 보수적으로 실패를 선언하고 브랜치를 잠갔습니다.
      </p>
      <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
        CONFLICTED FILES · 2
      </span>
      <div className="flex w-full flex-col gap-2">
        <span className="flex w-full items-center gap-2">
          <FileText className="size-[13px] text-ink-tertiary" />
          <span className="pen-text text-[13px] tracking-[-0.2px] text-link">
            specs/query-engine.md
          </span>
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
            both modified
          </span>
        </span>
        <span className="flex w-full items-center gap-2">
          <FileText className="size-[13px] text-ink-tertiary" />
          <span className="pen-text text-[13px] tracking-[-0.2px] text-link">index.md</span>
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
            both modified
          </span>
        </span>
      </div>
      <div className="h-px w-full bg-hairline" />
      <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
        ATTEMPTS · 1
      </span>
      <div className="flex w-full gap-2.5">
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[11px] bg-input">
          <span className="pen-text text-[8.5px] font-semibold text-ink-secondary">MJ</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
              민지 · 1시간 전
            </span>
            <span className="size-1.5 rounded-full bg-danger" />
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-danger">
              failed — 섹션 경계 불일치
            </span>
          </span>
          <span className="pen-text w-full text-[12.5px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary">
            "두 정책을 모두 나열하고 비교 표로 정리해줘"
          </span>
        </div>
      </div>
    </article>
  )
}

function EmptyPane() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3.5">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <GitMerge className="size-6 text-ink-tertiary" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
          No conflict selected
        </span>
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          왼쪽 목록에서 conflict를 선택하면 상세와 병합 지시가 표시됩니다
        </span>
      </div>
    </div>
  )
}

function MobileConflictDetail({ onBack }: { onBack: () => void }) {
  return (
    <>
      <MobileStatusBar />
      <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-4 text-ink-secondary" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="pen-text text-[14.5px] font-semibold tracking-[-0.22px] text-ink">
            feat/query-cache → dev
          </span>
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            cfl_04a2 · 26분 전
          </span>
        </div>
        <span className="flex items-center gap-[5px] rounded-pill bg-bg px-[9px] py-1">
          <span className="size-1.5 rounded-full bg-danger" />
          <span className="pen-text text-[10.5px] font-semibold tracking-[-0.1px] text-danger">
            Open
          </span>
        </span>
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4">
        <div className="flex w-full gap-2 rounded-[10px] bg-surface px-3 py-2.5">
          <span className="pt-0.5">
            <Lock className="size-3 text-danger" />
          </span>
          <span className="pen-text w-full text-[11.5px] leading-[1.5] tracking-[-0.1px] text-ink-secondary">
            이 브랜치의 context · query · ingest 요청은 해제 전까지 409로 거부됩니다.
          </span>
        </div>
        <div className="flex w-full flex-col gap-[11px] rounded-m bg-surface p-4">
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            LLM MERGE FAILURE
          </span>
          <p className="pen-text m-0 w-full text-[12.5px] leading-[1.6] tracking-[-0.12px] text-ink-secondary">
            Merge Agent가 '캐싱 정책' 섹션의 상충 정의 — dev의 'TTL 300초'와 feat의 '무기한 캐시 +
            수동 무효화' — 를 병합하지 못해 보수적으로 실패를 선언했습니다.
          </p>
          <div className="h-px w-full bg-hairline" />
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            CONFLICTED FILES · 2
          </span>
          <span className="flex w-full items-center gap-[7px]">
            <FileText className="size-3 text-ink-tertiary" />
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-link">
              specs/query-engine.md
            </span>
            <span className="h-px flex-1" />
            <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
              both modified
            </span>
          </span>
          <span className="flex w-full items-center gap-[7px]">
            <FileText className="size-3 text-ink-tertiary" />
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-link">index.md</span>
            <span className="h-px flex-1" />
            <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
              both modified
            </span>
          </span>
        </div>
        <div className="flex w-full flex-col gap-2 rounded-m bg-surface px-4 py-3.5">
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            ATTEMPTS · 1
          </span>
          <div className="flex w-full flex-col gap-[3px]">
            <span className="flex items-center gap-1.5">
              <span className="pen-text text-[11.5px] font-semibold tracking-[-0.1px] text-ink">
                민지 · 1시간 전
              </span>
              <span className="size-[5px] rounded-full bg-danger" />
              <span className="pen-text text-[10.5px] tracking-[-0.1px] text-danger">failed</span>
            </span>
            <span className="pen-text w-full text-[11.5px] leading-[1.5] tracking-[-0.1px] text-ink-tertiary">
              "두 정책을 모두 나열하고 비교 표로 정리해줘"
            </span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[21px] left-4 z-30 w-[358px]">
        <DirectiveBar placeholder="병합 방법을 자연어로 지시하세요…" />
      </div>
    </>
  )
}
