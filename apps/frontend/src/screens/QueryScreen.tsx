import {
  ArrowBigUp,
  ArrowUp,
  Delete,
  FileText,
  Globe,
  type LucideIcon,
  Sparkles,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AppShell } from "../components/AppShell.js"
import { BranchChip } from "../components/BranchChip.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"

/** 06 · Query (1440) + M06/M06b (390) */
export function QueryScreen() {
  // ?typing=1 → M06b 키보드 업 상태 딥링크
  const [params] = useSearchParams()
  const [typing, setTyping] = useState(params.get("typing") === "1")

  return (
    <>
      {/* ───── 데스크톱 06 ───── */}
      <div className="hidden h-full md:block">
        <AppShell active="query">
          <div className="flex w-full items-center gap-3.5 px-7 py-[18px]">
            <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px] text-ink">
              Query
            </h1>
            <BranchChip branch="dev" />
            <span className="h-px flex-1" />
            <button type="button" className="pen-text text-[13px] tracking-[-0.2px] text-link">
              View query log
            </button>
          </div>
          <div className="flex min-h-0 w-full flex-1 flex-col items-center pt-2 pb-6">
            <div className="flex h-full w-[760px] flex-col gap-5">
              {/* Question */}
              <div className="flex w-full flex-col items-end gap-[5px]">
                <div className="rounded-[16px] rounded-br-[4px] bg-input px-4 py-2.5">
                  <span className="pen-text text-[14.5px] tracking-[-0.22px] text-ink">
                    Stop 게이트는 어떤 조건에서 세션 종료를 차단해?
                  </span>
                </div>
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  민지 · 방금
                </span>
              </div>
              {/* Answer Card */}
              <div className="flex w-full flex-col gap-3.5 rounded-lg bg-surface px-[26px] py-[22px] shadow-[0_2px_12px_#0000000F]">
                <div className="flex items-center gap-[7px]">
                  <Sparkles className="size-3.5 text-accent" />
                  <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                    specraft
                  </span>
                  <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
                    · wiki 탐색 후 응답
                  </span>
                </div>
                <p className="pen-text m-0 w-full text-[14.5px] leading-[1.7] tracking-[-0.22px] text-ink-secondary">
                  Stop 게이트는 ① 워킹트리 clean ② HEAD push 완료 ③ 세션 ingest 마킹 — 3중 검사를
                  순서대로 수행하며, 하나라도 미충족이면 종료를 차단하고 commit → push → ingest
                  절차를 지시합니다.
                </p>
                <p className="pen-text m-0 w-full text-[14.5px] leading-[1.7] tracking-[-0.22px] text-ink-secondary">
                  변경도 커밋도 없는 read-only 세션은 D9 규칙으로 ingest가 면제됩니다. 서버에
                  접근할 수 없는 경우에도 게이트는 hard block을 유지합니다 — spec 무결성이
                  가용성보다 우선합니다.
                </p>
                <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                  CITATIONS · 3
                </span>
                <div className="flex items-center gap-2">
                  <Citation text="stop-gate.md#판정-매트릭스" />
                  <Citation text="stop-gate.md#면제-조건" />
                  <Citation text="adr-002-hard-gate.md" />
                </div>
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  query_id qx_8f31 · dev @ a1b2c3d · query 로그에 기록됨
                </span>
              </div>
              <div className="w-full flex-1" />
              {/* Ask Bar */}
              <div className="flex w-full items-center gap-3 rounded-pill bg-surface py-2 pr-2 pl-5 shadow-[3px_5px_30px_#00000038]">
                <input
                  type="text"
                  placeholder="이 프로젝트의 spec에 대해 무엇이든 물어보세요…"
                  className="pen-text w-full min-w-0 border-none bg-transparent text-[14px] tracking-[-0.22px] text-ink outline-none placeholder:text-ink-tertiary"
                />
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-accent"
                  aria-label="질문 전송"
                >
                  <ArrowUp className="size-[15px] text-white" />
                </button>
              </div>
              <div className="flex w-full justify-center">
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  응답은 현재 브랜치(dev)의 wiki를 기반으로 합니다 · 모든 질의는 기록됩니다
                </span>
              </div>
            </div>
          </div>
        </AppShell>
      </div>

      {/* ───── 모바일 M06/M06b ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div
          className={cn(
            "flex w-full items-center gap-2.5 px-4",
            typing ? "pt-1.5 pb-2" : "py-2",
          )}
        >
          <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
            Query
          </h1>
          <BranchChip branch="dev" />
          <span className="h-px flex-1" />
        </div>
        {typing ? (
          /* ─ M06b: 키보드 업 상태 — 캡슐·탭바 없음 ─ */
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-4 pt-1 pb-2.5">
              <div className="flex w-full flex-col items-end gap-1">
                <div className="rounded-[16px] rounded-br-[4px] bg-input px-3.5 py-[9px]">
                  <span className="pen-text block w-[240px] text-[13.5px] leading-[1.5] tracking-[-0.2px] text-ink">
                    ingest가 거부되는 경우는 언제야?
                  </span>
                </div>
                <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                  민지 · 5분 전
                </span>
              </div>
              <div className="flex w-full flex-col gap-2.5 rounded-lg bg-surface px-4 py-3.5 shadow-[0_2px_10px_#0000000D]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-[13px] text-accent" />
                  <span className="pen-text text-[11.5px] font-semibold tracking-[-0.1px] text-ink">
                    specraft
                  </span>
                </div>
                <p className="pen-text m-0 w-full text-[13px] leading-[1.6] tracking-[-0.2px] text-ink-secondary">
                  push되지 않은 커밋 hash로 요청하면 서버가 fetch 후에도 커밋을 찾지 못해
                  거부합니다(P2). 브랜치가 잠긴 경우에도 409로 거부됩니다.
                </p>
                <div className="flex gap-1.5">
                  <MobileCitation text="ingest-pipeline.md#p2-검증" />
                </div>
              </div>
            </div>
            <div className="w-full px-4 pt-1 pb-2">
              <div className="flex w-full items-center gap-0.5 rounded-pill border-[1.5px] border-accent bg-surface py-[7px] pr-[7px] pl-4 shadow-[0_3px_14px_#0000001A]">
                <span className="pen-text text-[13.5px] tracking-[-0.2px] text-ink">
                  Stop 게이트는 어떤 조
                </span>
                <span className="h-[17px] w-0.5 rounded-[1px] bg-accent" />
                <span className="h-px flex-1" />
                <button
                  type="button"
                  onClick={() => setTyping(false)}
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-accent"
                  aria-label="질문 전송"
                >
                  <ArrowUp className="size-3.5 text-white" />
                </button>
              </div>
            </div>
            <KoreanKeyboard onReturn={() => setTyping(false)} />
          </>
        ) : (
          /* ─ M06: 기본 상태 ─ */
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-2 pb-3">
              <div className="flex w-full flex-col items-end gap-1">
                <div className="rounded-[16px] rounded-br-[4px] bg-input px-3.5 py-[9px]">
                  <span className="pen-text block w-[250px] text-[13.5px] leading-[1.5] tracking-[-0.2px] text-ink">
                    Stop 게이트는 어떤 조건에서 세션 종료를 차단해?
                  </span>
                </div>
                <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                  민지 · 방금
                </span>
              </div>
              <div className="flex w-full flex-col gap-[11px] rounded-lg bg-surface p-4 shadow-[0_2px_10px_#0000000D]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-[13px] text-accent" />
                  <span className="pen-text text-[11.5px] font-semibold tracking-[-0.1px] text-ink">
                    specraft
                  </span>
                  <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                    · wiki 탐색 후 응답
                  </span>
                </div>
                <p className="pen-text m-0 w-full text-[13px] leading-[1.65] tracking-[-0.2px] text-ink-secondary">
                  Stop 게이트는 ① 워킹트리 clean ② HEAD push 완료 ③ 세션 ingest 마킹 — 3중 검사를
                  순서대로 수행하며, 하나라도 미충족이면 종료를 차단합니다.
                </p>
                <p className="pen-text m-0 w-full text-[13px] leading-[1.65] tracking-[-0.2px] text-ink-secondary">
                  read-only 세션은 D9 규칙으로 면제되며, 서버 불가 시에도 hard block이 유지됩니다 —
                  spec 무결성이 가용성보다 우선합니다.
                </p>
                <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
                  CITATIONS · 3
                </span>
                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <MobileCitation text="stop-gate.md#판정-매트릭스" />
                  </div>
                  <div className="flex gap-1.5">
                    <MobileCitation text="stop-gate.md#면제-조건" />
                    <MobileCitation text="adr-002-hard-gate.md" />
                  </div>
                </div>
                <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                  qx_8f31 · dev @ a1b2c3d · 로그에 기록됨
                </span>
              </div>
            </div>
            <div className="w-full px-4 pt-1.5 pb-2.5">
              <button
                type="button"
                onClick={() => setTyping(true)}
                className="flex w-full items-center gap-2.5 rounded-pill bg-surface py-[7px] pr-[7px] pl-4 text-left shadow-[0_3px_16px_#0000001F]"
              >
                <span className="pen-text text-[13.5px] tracking-[-0.2px] text-ink-tertiary">
                  spec에 대해 물어보세요…
                </span>
                <span className="h-px flex-1" />
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-accent">
                  <ArrowUp className="size-3.5 text-white" />
                </span>
              </button>
            </div>
            <div className="w-full px-4 pt-0.5 pb-2.5">
              <GlassNav active="query" className="w-full" />
            </div>
            <MobileTabBar active="spec" />
          </>
        )}
      </div>
    </>
  )
}

function Citation({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-[6px] bg-bg px-2.5 py-[5px]">
      <FileText className="size-[11px] text-ink-tertiary" />
      <span className="pen-text text-[12px] tracking-[-0.12px] text-link">{text}</span>
    </span>
  )
}

function MobileCitation({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-[5px] rounded-[6px] bg-bg px-[9px] py-1">
      <FileText className="size-2.5 text-ink-tertiary" />
      <span className="pen-text text-[11px] tracking-[-0.1px] text-link">{text}</span>
    </span>
  )
}

/* ───── M06b 한글 키보드 (iOS) ───── */

function Key({
  children,
  wide,
  tone = "white",
  grow,
  onClick,
}: {
  children: ReactNode
  wide?: number
  tone?: "white" | "gray" | "accent"
  grow?: boolean
  onClick?: (() => void) | undefined
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={wide ? { width: wide } : undefined}
      className={cn(
        "flex h-[42px] items-center justify-center rounded-[5.5px] shadow-[0_1px_0_#898A8D]",
        tone === "white" && "bg-white",
        tone === "gray" && "bg-[#ADB3BC]",
        tone === "accent" && "bg-accent",
        grow && "min-w-0 flex-1",
        !wide && !grow && "min-w-0 flex-1",
      )}
    >
      {children}
    </button>
  )
}

function KeyLabel({ children }: { children: ReactNode }) {
  return <span className="pen-text text-[16.5px] text-black">{children}</span>
}

function KeyIcon({ icon: Icon, size }: { icon: LucideIcon; size: number }) {
  return <Icon style={{ width: size, height: size }} className="text-black" />
}

function KoreanKeyboard({ onReturn }: { onReturn: () => void }) {
  const row1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"]
  const row2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"]
  const row3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"]
  return (
    <div className="flex w-full shrink-0 flex-col gap-[11px] bg-[#D2D5DB] px-[3px] pt-2.5">
      {/* Suggestion Bar */}
      <div className="-mx-[3px] -mt-2.5 flex h-[46px] w-[calc(100%+6px)] items-center border-t border-[#00000014]">
        <span className="flex h-full flex-1 items-center justify-center">
          <span className="pen-text text-[15px] tracking-[-0.2px] text-ink">조건</span>
        </span>
        <span className="h-6 w-px bg-[#00000026]" />
        <span className="flex h-full flex-1 items-center justify-center">
          <span className="pen-text text-[15px] tracking-[-0.2px] text-ink">조건에서</span>
        </span>
        <span className="h-6 w-px bg-[#00000026]" />
        <span className="flex h-full flex-1 items-center justify-center">
          <span className="pen-text text-[15px] tracking-[-0.2px] text-ink">조건이</span>
        </span>
      </div>
      <div className="flex w-full gap-1.5">
        {row1.map((k) => (
          <Key key={k}>
            <KeyLabel>{k}</KeyLabel>
          </Key>
        ))}
      </div>
      <div className="flex w-full gap-1.5 px-5">
        {row2.map((k) => (
          <Key key={k}>
            <KeyLabel>{k}</KeyLabel>
          </Key>
        ))}
      </div>
      <div className="flex w-full gap-1.5">
        <Key wide={44} tone="gray">
          <KeyIcon icon={ArrowBigUp} size={18} />
        </Key>
        {row3.map((k) => (
          <Key key={k}>
            <KeyLabel>{k}</KeyLabel>
          </Key>
        ))}
        <Key wide={44} tone="gray">
          <KeyIcon icon={Delete} size={19} />
        </Key>
      </div>
      <div className="flex w-full gap-1.5">
        <Key wide={46} tone="gray">
          <span className="pen-text text-[14px] text-black">123</span>
        </Key>
        <Key wide={46} tone="gray">
          <KeyIcon icon={Globe} size={17} />
        </Key>
        <Key grow>
          <span className="pen-text text-[13px] text-[#00000066]">스페이스</span>
        </Key>
        <Key wide={88} tone="accent" onClick={onReturn}>
          <span className="pen-text text-[14px] font-medium text-white">이동</span>
        </Key>
      </div>
      <div className="flex h-[26px] w-full items-center justify-center">
        <span className="h-[5px] w-[134px] rounded-[3px] bg-ink" />
      </div>
    </div>
  )
}
