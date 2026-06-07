import type { Citation, QueryResponse } from "@specraft/shared"
import {
  ArrowBigUp,
  ArrowUp,
  Delete,
  FileText,
  Globe,
  type LucideIcon,
  Sparkles,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { Link } from "react-router-dom"
import { BranchChip } from "../components/BranchChip.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { LiveShell } from "./LiveShell.js"

const commitHash = "frontend-live"

/** 단락 분리 — JSX 키용 고유 id 부여 */
function paragraphsOf(text: string): { id: string; text: string }[] {
  return text.split(/\n\n+/).map((paragraph, index) => ({ id: `p${index}`, text: paragraph }))
}

/** 06 · Query (Desktop) + M06/M06b (Mobile) — 디자인 충실 + 실데이터 */
export function QueryPage() {
  const { client } = useSpecraft()
  const { selectedBranch } = useBranch()
  const branch = selectedBranch
  const [question, setQuestion] = useState("")
  const [turns, setTurns] = useState<QueryTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [pending, setPending] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const trimmedQuestion = question.trim()

  async function submit(): Promise<void> {
    if (trimmedQuestion.length === 0 || pending) {
      return
    }
    setError(null)
    const asked = trimmedQuestion
    // 사용자 질문을 즉시 화면에 반영하고 응답 대기 인디케이터를 띄운다.
    setPending(true)
    setPendingQuestion(asked)
    setQuestion("")
    try {
      const response = await client.query({
        branch,
        commit_hash: commitHash,
        question: asked,
      })
      setTurns((current) => [...current, { question: asked, answer: response }])
      setTyping(false)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Query failed")
      // 전송 실패 시 질문을 입력창으로 되돌려 재시도할 수 있게 한다.
      setQuestion(asked)
    } finally {
      setPending(false)
      setPendingQuestion(null)
    }
  }

  return (
    <>
      {/* ───── 데스크톱 06 ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title="Query"
          titleRight={
            <Link to="/activity" className="pen-text text-[13px] tracking-[-0.2px] text-link">
              View query log
            </Link>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col items-center px-7 pb-7">
            <div className="flex h-full w-full max-w-[760px] flex-col gap-5">
              <div className="flex flex-1 flex-col justify-end gap-5 overflow-y-auto">
                {turns.length === 0 && error === null && !pending && (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                      이 프로젝트의 spec에 대해 무엇이든 물어보세요
                    </span>
                  </div>
                )}
                {turns.map((turn) => (
                  <DesktopTurn key={turn.answer.query_id} turn={turn} branch={branch} />
                ))}
                {pending && pendingQuestion !== null && (
                  <DesktopPendingTurn question={pendingQuestion} />
                )}
                {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
              </div>
              <AskBar
                question={question}
                onChange={setQuestion}
                onSubmit={submit}
                disabled={trimmedQuestion.length === 0 || pending}
              />
              <div className="flex w-full justify-center">
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  응답은 현재 브랜치({branch})의 wiki를 기반으로 합니다 · 모든 질의는 기록됩니다
                </span>
              </div>
            </div>
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M06/M06b ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div
          className={cn("flex w-full items-center gap-2.5 px-4", typing ? "pt-1.5 pb-2" : "py-2")}
        >
          <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
            Query
          </h1>
          <BranchChip branch={branch} />
          <span className="h-px flex-1" />
        </div>
        {typing ? (
          /* ─ M06b: 키보드 업 상태 — 캡슐·탭바 없음 ─ */
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1 pb-2.5">
              {turns.map((turn) => (
                <MobileTurn key={turn.answer.query_id} turn={turn} compact />
              ))}
              {pending && pendingQuestion !== null && (
                <MobilePendingTurn question={pendingQuestion} compact />
              )}
              {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
            </div>
            <div className="w-full px-4 pt-1 pb-2">
              <div className="flex w-full items-center gap-0.5 rounded-pill border-[1.5px] border-accent bg-surface py-[7px] pr-[7px] pl-4 shadow-[0_3px_14px_#0000001A] focus-within:ring-2 focus-within:ring-accent">
                <label className="sr-only" htmlFor="specraft-question-mobile">
                  질문
                </label>
                <input
                  id="specraft-question-mobile"
                  value={question}
                  onChange={(event) => setQuestion(event.currentTarget.value)}
                  onBlur={() => setTyping(false)}
                  placeholder="이 프로젝트의 spec에 대해 무엇이든 물어보세요…"
                  className="pen-text min-w-0 flex-1 border-none bg-transparent text-[13.5px] tracking-[-0.2px] text-ink outline-none max-md:text-[16px] placeholder:text-ink-tertiary"
                />
                <button
                  type="button"
                  disabled={trimmedQuestion.length === 0 || pending}
                  onClick={submit}
                  className="group -m-[7px] flex size-11 shrink-0 items-center justify-center"
                  aria-label="질문 전송"
                >
                  <span className="flex size-[30px] items-center justify-center rounded-[15px] bg-accent group-disabled:bg-separator">
                    <ArrowUp className="size-3.5 text-white" />
                  </span>
                </button>
              </div>
            </div>
            <KoreanKeyboard onReturn={submit} />
          </>
        ) : (
          /* ─ M06: 기본 상태 ─ */
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-2 pb-3">
              {turns.length === 0 && error === null && !pending && (
                <div className="flex flex-1 items-center justify-center">
                  <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                    spec에 대해 무엇이든 물어보세요
                  </span>
                </div>
              )}
              {turns.map((turn) => (
                <MobileTurn key={turn.answer.query_id} turn={turn} />
              ))}
              {pending && pendingQuestion !== null && (
                <MobilePendingTurn question={pendingQuestion} />
              )}
              {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
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

type QueryTurn = {
  readonly question: string
  readonly answer: QueryResponse
}

function citationLabel(citation: Citation): string {
  return `${citation.path}#${citation.section}`
}

/* ───── 데스크톱 대화 턴 ───── */

function DesktopTurn({ turn, branch }: { turn: QueryTurn; branch: string }) {
  const { answer } = turn
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full flex-col items-end gap-[5px]">
        <div className="rounded-[16px] rounded-br-[4px] bg-input px-4 py-2.5">
          <span className="pen-text text-[14.5px] tracking-[-0.22px] text-ink">
            {turn.question}
          </span>
        </div>
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">· 방금</span>
      </div>
      <article className="flex flex-col gap-3.5 rounded-[16px] bg-surface px-[26px] py-[22px] shadow-[0_2px_12px_#0000000F]">
        <div className="flex items-center gap-[7px]">
          <Sparkles className="size-3.5 text-accent" />
          <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
            specraft
          </span>
          <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
            · wiki 탐색 후 응답
          </span>
        </div>
        {paragraphsOf(answer.answer).map((paragraph) => (
          <p
            key={paragraph.id}
            className="pen-text m-0 text-[14.5px] leading-[1.7] tracking-[-0.22px] text-ink-secondary"
          >
            {paragraph.text}
          </p>
        ))}
        {answer.citations.length > 0 && (
          <>
            <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
              CITATIONS · {answer.citations.length}
            </span>
            <div className="flex flex-wrap gap-2">
              {answer.citations.map((citation) => (
                <Cit key={citationLabel(citation)} text={citationLabel(citation)} />
              ))}
            </div>
          </>
        )}
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
          query_id {answer.query_id} · {branch} @ {commitHash} · query 로그에 기록됨
        </span>
      </article>
    </div>
  )
}

/* ───── 데스크톱 응답 대기 턴 ───── */

function DesktopPendingTurn({ question }: { question: string }) {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full flex-col items-end gap-[5px]">
        <div className="rounded-[16px] rounded-br-[4px] bg-input px-4 py-2.5">
          <span className="pen-text text-[14.5px] tracking-[-0.22px] text-ink">{question}</span>
        </div>
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">· 방금</span>
      </div>
      <article
        aria-live="polite"
        aria-busy="true"
        className="flex items-center gap-[7px] rounded-[16px] bg-surface px-[26px] py-[22px] shadow-[0_2px_12px_#0000000F]"
      >
        <Sparkles className="size-3.5 animate-pulse text-accent" />
        <span className="pen-text animate-pulse text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
          specraft
        </span>
        <span className="pen-text animate-pulse text-[12px] tracking-[-0.12px] text-ink-tertiary">
          · wiki 탐색 중…
        </span>
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      </article>
    </div>
  )
}

/* ───── 모바일 대화 턴 ───── */

function MobileTurn({ turn, compact = false }: { turn: QueryTurn; compact?: boolean }) {
  const { answer } = turn
  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex w-full flex-col items-end gap-1">
        <div className="rounded-[16px] rounded-br-[4px] bg-input px-3.5 py-[9px]">
          <span className="pen-text block max-w-[250px] text-[13.5px] leading-[1.5] tracking-[-0.2px] text-ink">
            {turn.question}
          </span>
        </div>
        <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">· 방금</span>
      </div>
      <div
        className={cn(
          "flex w-full flex-col rounded-[16px] bg-surface shadow-[0_2px_10px_#0000000D]",
          compact ? "gap-2.5 px-4 py-3.5" : "gap-[11px] p-4",
        )}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-[13px] text-accent" />
          <span className="pen-text text-[11.5px] font-semibold tracking-[-0.1px] text-ink">
            specraft
          </span>
          {!compact && (
            <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
              · wiki 탐색 후 응답
            </span>
          )}
        </div>
        {paragraphsOf(answer.answer).map((paragraph) => (
          <p
            key={paragraph.id}
            className={cn(
              "pen-text m-0 w-full tracking-[-0.2px] text-ink-secondary",
              compact ? "text-[13px] leading-[1.6]" : "text-[13px] leading-[1.65]",
            )}
          >
            {paragraph.text}
          </p>
        ))}
        {answer.citations.length > 0 && (
          <>
            {!compact && (
              <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
                CITATIONS · {answer.citations.length}
              </span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {answer.citations.map((citation) => (
                <MobileCit key={citationLabel(citation)} text={citationLabel(citation)} />
              ))}
            </div>
          </>
        )}
        {!compact && (
          <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
            {answer.query_id} · 로그에 기록됨
          </span>
        )}
      </div>
    </div>
  )
}

/* ───── 모바일 응답 대기 턴 ───── */

function MobilePendingTurn({ question, compact = false }: { question: string; compact?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex w-full flex-col items-end gap-1">
        <div className="rounded-[16px] rounded-br-[4px] bg-input px-3.5 py-[9px]">
          <span className="pen-text block max-w-[250px] text-[13.5px] leading-[1.5] tracking-[-0.2px] text-ink">
            {question}
          </span>
        </div>
        <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">· 방금</span>
      </div>
      <div
        aria-live="polite"
        aria-busy="true"
        className={cn(
          "flex w-full items-center gap-1.5 rounded-[16px] bg-surface shadow-[0_2px_10px_#0000000D]",
          compact ? "px-4 py-3.5" : "p-4",
        )}
      >
        <Sparkles className="size-[13px] animate-pulse text-accent" />
        <span className="pen-text animate-pulse text-[11.5px] font-semibold tracking-[-0.1px] text-ink">
          specraft
        </span>
        <span className="pen-text animate-pulse text-[11px] tracking-[-0.1px] text-ink-tertiary">
          · wiki 탐색 중…
        </span>
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      </div>
    </div>
  )
}

/* ───── Ask Bar (데스크톱) ───── */

function AskBar({
  question,
  onChange,
  onSubmit,
  disabled,
}: {
  question: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-pill bg-surface py-2 pr-2 pl-5 shadow-[3px_5px_30px_#00000038] focus-within:ring-2 focus-within:ring-accent">
      <label className="sr-only" htmlFor="specraft-question">
        질문
      </label>
      <input
        id="specraft-question"
        value={question}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onSubmit()
          }
        }}
        className="pen-text w-full border-none bg-transparent text-[14px] tracking-[-0.22px] text-ink outline-none placeholder:text-ink-tertiary"
        placeholder="이 프로젝트의 spec에 대해 무엇이든 물어보세요…"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="flex size-8 shrink-0 items-center justify-center rounded-[16px] bg-accent disabled:bg-separator"
        aria-label="질문 전송"
      >
        <ArrowUp className="size-[15px] text-white" />
      </button>
    </div>
  )
}

/* ───── Citation 칩 ───── */

function Cit({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-[6px] bg-bg px-2.5 py-[5px]">
      <FileText className="size-[11px] text-ink-tertiary" />
      <span className="pen-text text-[12px] tracking-[-0.12px] text-link">{text}</span>
    </span>
  )
}

function MobileCit({ text }: { text: string }) {
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
        "flex h-[42px] items-center justify-center rounded-[5.5px] shadow-[0_1px_0_#898A8D] transition-colors duration-150 ease-[var(--ease-standard)]",
        tone === "white" && "bg-white active:bg-input",
        tone === "gray" && "bg-[#ADB3BC] active:brightness-95",
        tone === "accent" && "bg-accent active:brightness-95",
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
