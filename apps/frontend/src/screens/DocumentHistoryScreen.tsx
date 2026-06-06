import { Check, ChevronDown, ChevronLeft, GitMerge, History } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "../components/AppShell.js"
import { BranchChip } from "../components/BranchChip.js"
import { IconButton } from "../components/IconButton.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { SelectCard } from "../components/SelectCard.js"
import { cn } from "../lib/cn.js"

type Version = {
  hash: string
  author: string
  initials?: string
  badge?: "MERGE" | "INIT"
  time: string
  summary: string
  plus?: string
  minus?: string
  selected?: boolean
}

const VERSIONS: Version[] = [
  { hash: "a1b2c3d", author: "수연", initials: "SY", time: "2시간 전", summary: "게이트 면제 조건 D9 반영, 매트릭스 셀 정리", plus: "+14", minus: "−3", selected: true },
  { hash: "7d21f0a", author: "민지", initials: "MJ", time: "어제", summary: "3중 검사 순서 및 차단 지시 문구 명시", plus: "+9", minus: "−2" },
  { hash: "3c9b771", author: "수연", initials: "SY", time: "2일 전", summary: "게이트 매트릭스 초안", plus: "+31", minus: "−0" },
  { hash: "f00dba2", author: "specraft-server", badge: "MERGE", time: "4일 전", summary: "feat/stop-gate → dev 병합" },
  { hash: "1a0f9e3", author: "민지", initials: "MJ", badge: "INIT", time: "5일 전", summary: "specraft-init 초기 대량 ingest", plus: "+48", minus: "−0" },
]

/** 05b · Document — History (1440) + M05b/M05c (390) */
export function DocumentHistoryScreen() {
  const navigate = useNavigate()
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)

  return (
    <>
      {/* ───── 데스크톱 05b ───── */}
      <div className="hidden h-full md:block">
        <AppShell active="specs">
          {/* Toolbar */}
          <div className="flex w-full items-center gap-3 px-7 py-4">
            <IconButton icon={ChevronLeft} onClick={() => navigate("/specs/doc/stop-gate")} />
            <div className="flex items-center gap-1.5">
              <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                specs /
              </span>
              <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                stop-gate.md
              </span>
            </div>
            <div className="flex items-center gap-[5px] rounded-pill bg-dark-card px-2.5 py-1">
              <History className="size-[11px] text-white" />
              <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-white">
                History
              </span>
            </div>
            <span className="h-px flex-1" />
            <BranchChip branch="dev" />
            <button
              type="button"
              onClick={() => navigate("/specs/doc/stop-gate")}
              className="flex items-center justify-center gap-1.5 rounded-s bg-accent px-4 py-2"
            >
              <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Done</span>
            </button>
          </div>
          {/* History Body */}
          <div className="flex min-h-0 w-full flex-1 gap-[22px] px-7 pb-7">
            {/* Doc Sheet (버전 뷰) */}
            <article className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto rounded-l bg-surface px-10 py-7">
              <div className="flex w-full items-center gap-2 rounded-s bg-bg px-3.5 py-[9px]">
                <History className="size-[13px] text-ink-tertiary" />
                <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
                  버전 a1b2c3d을 보는 중 — 수연의 ingest · 2시간 전
                </span>
                <span className="h-px flex-1" />
                <button
                  type="button"
                  className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-link"
                >
                  최신 버전으로
                </button>
              </div>
              <h1 className="pen-text m-0 w-full font-display text-[26px] leading-[1.18] font-semibold tracking-[-0.38px] text-ink">
                Stop 게이트 판정 규칙
              </h1>
              <span className="pen-text w-full text-[12px] tracking-[-0.12px] text-ink-tertiary">
                specs/stop-gate.md · 이 버전 a1b2c3d · 이전 7d21f0a 대비 +14 −3
              </span>
              <div className="h-px w-full shrink-0 bg-hairline" />
              <p className="pen-text m-0 w-full text-[14px] leading-[1.65] tracking-[-0.22px] text-ink-secondary">
                Stop 게이트는 세션 종료 시점에 세 가지 검사를 순서대로 수행한다 — ① 워킹트리 clean
                ② HEAD push 완료 ③ 세션 ingest 마킹 존재. 하나라도 미충족이면 종료를 차단하고
                commit → push → ingest 절차를 지시한다.
              </p>
              <h2 className="pen-text m-0 w-full font-display text-[17px] font-semibold tracking-[-0.26px] text-ink">
                판정 매트릭스
              </h2>
              <div className="w-full overflow-hidden rounded-s bg-[#E9F6EE]">
                <div className="flex w-full flex-col gap-1.5 px-3.5 py-2.5">
                  <span className="pen-text text-[9px] font-semibold tracking-[0.8px] text-[#1E8E3E]">
                    + ADDED
                  </span>
                  <span className="pen-text w-full text-[13.5px] leading-[1.55] tracking-[-0.2px] text-ink-secondary">
                    read-only 세션(변경 · 커밋 0건)은 ingest 강제를 면제한다 — D9
                  </span>
                  <span className="pen-text w-full text-[13.5px] leading-[1.55] tracking-[-0.2px] text-ink-secondary">
                    dirty-uncommitted는 면제가 아니다 — clean 검사(①)에서 차단
                  </span>
                </div>
              </div>
              <div className="w-full overflow-hidden rounded-s bg-[#FBEEEC]">
                <div className="flex w-full flex-col gap-1.5 px-3.5 py-2.5">
                  <span className="pen-text text-[9px] font-semibold tracking-[0.8px] text-[#C5221F]">
                    − REMOVED
                  </span>
                  <span className="pen-text w-full text-[13.5px] leading-[1.55] tracking-[-0.2px] text-ink-tertiary">
                    서버 응답이 없으면 5분 대기 후 게이트를 통과시킨다
                  </span>
                </div>
              </div>
              <div className="flex w-full gap-[9px]">
                <span className="pt-2">
                  <span className="block size-[4.5px] rounded-full bg-ink-tertiary" />
                </span>
                <span className="pen-text w-full text-[14px] leading-[1.6] tracking-[-0.22px] text-ink-secondary">
                  서버 도달 불가 시에도 hard block 유지 — spec 무결성 &gt; 가용성 (D1)
                </span>
              </div>
            </article>
            {/* History Panel */}
            <aside className="flex w-[360px] shrink-0 flex-col gap-2.5 overflow-y-auto">
              <div className="flex w-full flex-col gap-0.5 px-1">
                <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                  History
                </span>
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  specs/stop-gate.md · 12 versions
                </span>
              </div>
              {VERSIONS.map((v) => (
                <SelectCard key={v.hash} selected={v.selected ?? false} onClick={() => {}}>
                  <div className="flex w-full items-center gap-[7px]">
                    {v.badge === "MERGE" ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-dark-card">
                        <GitMerge className="size-[11px] text-white" />
                      </span>
                    ) : (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-input">
                        <span className="pen-text text-[8px] font-semibold text-ink-secondary">
                          {v.initials}
                        </span>
                      </span>
                    )}
                    <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                      {v.author}
                    </span>
                    {v.badge && (
                      <span className="flex items-center rounded-[4px] bg-input px-[5px] py-px">
                        <span className="pen-text text-[8px] font-semibold tracking-[0.5px] text-ink-secondary">
                          {v.badge}
                        </span>
                      </span>
                    )}
                    <span className="h-px flex-1" />
                    <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                      {v.time}
                    </span>
                  </div>
                  <span className="pen-text w-full text-[12.5px] leading-[1.45] tracking-[-0.12px] text-ink-secondary">
                    {v.summary}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center rounded-[4px] bg-bg px-1.5 py-0.5">
                      <span className="pen-text font-mono text-[9.5px] text-ink-secondary">
                        {v.hash}
                      </span>
                    </span>
                    {v.plus && (
                      <span className="pen-text font-mono text-[10px] text-[#1E8E3E]">
                        {v.plus}
                      </span>
                    )}
                    {v.minus && (
                      <span className="pen-text font-mono text-[10px] text-[#C5221F]">
                        {v.minus}
                      </span>
                    )}
                  </div>
                </SelectCard>
              ))}
            </aside>
          </div>
        </AppShell>
      </div>

      {/* ───── 모바일 M05b/M05c ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
          <button
            type="button"
            onClick={() => navigate("/specs/doc/stop-gate")}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-4 text-ink-secondary" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="pen-text text-[15.5px] font-semibold tracking-[-0.24px] text-ink">
              History
            </span>
            <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              specs/stop-gate.md · 12 versions
            </span>
          </div>
          <span className="flex items-center gap-1 rounded-pill bg-dark-card px-[9px] py-1">
            <History className="size-2.5 text-white" />
            <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-white">
              a1b2c3d
            </span>
          </span>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 px-4 pb-4">
          {/* Version Banner — 드롭다운 트리거 */}
          <button
            type="button"
            onClick={() => setVersionMenuOpen((o) => !o)}
            className="flex w-full items-center gap-[7px] rounded-[10px] bg-surface px-3 py-[9px] text-left"
          >
            <History className="size-3 shrink-0 text-ink-tertiary" />
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-secondary">
              버전 a1b2c3d을 보는 중 — 수연 · 2시간 전
            </span>
            <ChevronDown
              className={cn("size-[13px] text-ink-tertiary", versionMenuOpen && "rotate-180")}
            />
            <span className="h-px flex-1" />
            <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-link">
              최신으로
            </span>
          </button>
          {/* Diff Sheet */}
          <article className="flex w-full flex-col gap-[9px] rounded-m bg-surface px-4 py-3.5">
            <h1 className="pen-text m-0 w-full font-display text-[17.5px] font-semibold tracking-[-0.28px] text-ink">
              Stop 게이트 판정 규칙
            </h1>
            <span className="pen-text w-full text-[10px] tracking-[-0.1px] text-ink-tertiary">
              이전 7d21f0a 대비 +14 −3
            </span>
            <div className="h-px w-full shrink-0 bg-hairline" />
            <h2 className="pen-text m-0 w-full font-display text-[14px] font-semibold tracking-[-0.22px] text-ink">
              판정 매트릭스
            </h2>
            <div className="flex w-full flex-col gap-[5px] rounded-s bg-[#E9F6EE] px-3 py-[9px]">
              <span className="pen-text text-[8.5px] font-semibold tracking-[0.8px] text-[#1E8E3E]">
                + ADDED
              </span>
              <span className="pen-text w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-secondary">
                read-only 세션(변경 · 커밋 0건)은 ingest 강제를 면제한다 — D9
              </span>
              <span className="pen-text w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-secondary">
                dirty-uncommitted는 면제가 아니다 — clean 검사에서 차단
              </span>
            </div>
            <div className="flex w-full flex-col gap-[5px] rounded-s bg-[#FBEEEC] px-3 py-[9px]">
              <span className="pen-text text-[8.5px] font-semibold tracking-[0.8px] text-[#C5221F]">
                − REMOVED
              </span>
              <span className="pen-text w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary">
                서버 응답이 없으면 5분 대기 후 게이트를 통과시킨다
              </span>
            </div>
          </article>
        </div>
        {/* M05c — Version Menu 드롭다운 */}
        {versionMenuOpen && (
          <div className="absolute top-[132px] left-4 z-40 flex w-[358px] flex-col gap-px rounded-m bg-surface p-1.5 shadow-[0_6px_24px_#00000030]">
            <div className="flex w-full items-center px-2.5 pt-[7px] pb-[5px]">
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                VERSIONS
              </span>
              <span className="h-px flex-1" />
              <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">12</span>
            </div>
            {VERSIONS.filter((v) => v.hash !== "3c9b771").map((v) => (
              <button
                key={v.hash}
                type="button"
                onClick={() => setVersionMenuOpen(false)}
                className={cn(
                  "flex h-[38px] w-full items-center gap-[7px] rounded-[7px] px-2.5",
                  v.selected && "bg-bg",
                )}
              >
                {v.badge === "MERGE" ? (
                  <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[9px] bg-dark-card">
                    <GitMerge className="size-2.5 text-white" />
                  </span>
                ) : (
                  <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[9px] bg-input">
                    <span className="pen-text text-[7.5px] font-semibold text-ink-secondary">
                      {v.initials}
                    </span>
                  </span>
                )}
                <span
                  className={cn(
                    "pen-text text-[12px] tracking-[-0.12px] text-ink",
                    v.selected && "font-semibold",
                  )}
                >
                  {v.author}
                </span>
                {v.badge && (
                  <span className="flex items-center rounded-[4px] bg-input px-[5px] py-px">
                    <span className="pen-text text-[7.5px] font-semibold tracking-[0.5px] text-ink-secondary">
                      {v.badge}
                    </span>
                  </span>
                )}
                <span className="pen-text font-mono text-[9.5px] text-ink-tertiary">{v.hash}</span>
                <span className="h-px flex-1" />
                <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                  {v.time}
                </span>
                {v.selected && <Check className="size-[13px] text-accent" />}
              </button>
            ))}
            <div className="h-px w-full bg-hairline" />
            <div className="w-full px-2.5 py-1.5">
              <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                wiki.git의 커밋 하나가 하나의 버전입니다
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
