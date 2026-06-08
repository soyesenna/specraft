import type { Citation, QueryLogDetail, QueryResponse } from "@specraft/shared"
import { SpecraftHttpError } from "@specraft/shared"
import { AlertTriangle, ChevronLeft, MessageCircle, RefreshCw, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ButtonSecondary } from "../components/buttons.js"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { IconButton } from "../components/IconButton.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { actorInitials, relativeTime } from "./DocumentPage.js"
import { LiveShell } from "./LiveShell.js"
import {
  appendTextStep,
  Cit,
  citationLabel,
  fillToolResult,
  MobileCit,
  StepTimeline,
  type StreamStep,
} from "./QueryPage.js"

const commitHash = "frontend-live"

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const pad = (value: number): string => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 저장된 tool_calls → StepTimeline용 StreamStep[] (+ 답변 본문을 마지막 text 단계로) */
function buildSavedSteps(log: QueryLogDetail): StreamStep[] {
  const toolSteps: StreamStep[] = log.tool_calls.map((call) => ({
    kind: "tool",
    name: call.name,
    args: call.arguments,
    result: call.result,
  }))
  if (log.answer && log.answer.length > 0) {
    return [...toolSteps, { kind: "text", text: log.answer }]
  }
  return toolSteps
}

/**
 * 07b · Query Detail (ZXEiK) + M07b (F4jkv) — 디자인 충실 + 저장된 상세 데이터.
 * getQueryLog(id)의 저장된 answer/citations/tool_calls를 우선 렌더하고,
 * 답변이 기록되기 전 생성된 구(舊) 로그(answer=null)만 현재 브랜치 재질의로 폴백한다.
 */
export function QueryDetailPage() {
  const { client } = useSpecraft()
  const navigate = useNavigate()
  const { id } = useParams()
  const [log, setLog] = useState<QueryLogDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // 폴백 재질의 상태 (log.answer === null 일 때만 사용)
  const [steps, setSteps] = useState<StreamStep[]>([])
  const [liveAnswer, setLiveAnswer] = useState<QueryResponse | null>(null)
  const [pending, setPending] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey는 Retry가 동일 입력으로 재요청을 강제하는 트리거.
  useEffect(() => {
    let active = true
    setLog(null)
    setError(null)
    setNotFound(false)
    setSteps([])
    setLiveAnswer(null)
    setQueryError(null)
    if (id === undefined) {
      setNotFound(true)
      return
    }
    void client
      .getQueryLog(id)
      .then((detail) => {
        if (active) {
          setLog(detail)
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return
        }
        if (caught instanceof SpecraftHttpError && caught.status === 404) {
          setNotFound(true)
        } else {
          setError(caught instanceof Error ? caught.message : "Failed to load query")
        }
      })
    return () => {
      active = false
    }
  }, [client, id, reloadKey])

  // 저장된 답변이 없는 구 로그만 원 브랜치에서 재질의해 타임라인을 채운다.
  useEffect(() => {
    if (!log || log.answer !== null) {
      return
    }
    let active = true
    let live: StreamStep[] = []
    setSteps([])
    setLiveAnswer(null)
    setQueryError(null)
    setPending(true)
    const apply = (next: StreamStep[]): void => {
      live = next
      if (active) {
        setSteps(next)
      }
    }
    void client
      .queryStream(
        { branch: log.branch, commit_hash: commitHash, question: log.question },
        {
          onDelta: (text) => apply(appendTextStep(live, text)),
          onToolCall: (call) =>
            apply([...live, { kind: "tool", name: call.name, args: call.arguments, result: null }]),
          onToolResult: (toolResult) => apply(fillToolResult(live, toolResult.result)),
        },
      )
      .then((response) => {
        if (active) {
          setLiveAnswer(response)
          setSteps(live)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setQueryError(caught instanceof Error ? caught.message : "Query failed")
        }
      })
      .finally(() => {
        if (active) {
          setPending(false)
        }
      })
    return () => {
      active = false
    }
  }, [client, log])

  const retry = () => {
    setReloadKey((key) => key + 1)
  }

  const loading = log === null && error === null && !notFound
  const back = () => {
    navigate("/activity")
  }

  // 표시 데이터: 저장본 우선, 없으면 재질의 결과
  const saved = log !== null && log.answer !== null
  const displaySteps: readonly StreamStep[] = log && saved ? buildSavedSteps(log) : steps
  const displayCitations: readonly Citation[] = saved
    ? (log?.citations ?? [])
    : (liveAnswer?.citations ?? [])
  const livePending = !saved && pending

  const bodyFor = (mobile: boolean) =>
    error ? (
      <QueryDetailError message={error} onRetry={retry} mobile={mobile} />
    ) : notFound ? (
      <QueryDetailNotFound onBack={back} mobile={mobile} />
    ) : loading || !log ? (
      <QuerySkeleton mobile={mobile} />
    ) : (
      <QueryBody
        log={log}
        steps={displaySteps}
        citations={displayCitations}
        pending={livePending}
        saved={saved}
        queryError={queryError}
        mobile={mobile}
      />
    )

  return (
    <>
      {/* ───── 데스크톱 07b ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title=""
          titlePrefix={
            <div className="flex items-center gap-3">
              <IconButton icon={ChevronLeft} onClick={back} aria-label="Activity로 돌아가기" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={back}
                  className="pen-text text-[13px] font-medium tracking-[-0.2px] text-link"
                >
                  Activity
                </button>
                <span className="pen-text text-[13px] text-separator">/</span>
                <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink-tertiary">
                  Query {log ? log.id.slice(0, 7) : ""}
                </span>
              </div>
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pt-1 pb-7">
            {bodyFor(false)}
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M07b ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2 border-b border-hairline px-2.5 py-2">
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-0.5 rounded-[7px] py-[5px] pr-2 pl-1"
            aria-label="Activity로 돌아가기"
          >
            <ChevronLeft className="size-[19px] text-link" />
            <span className="pen-text text-[14.5px] tracking-[-0.2px] text-link">Activity</span>
          </button>
          <span className="h-px flex-1" />
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-3.5 pb-[110px]">
          {bodyFor(true)}
        </div>
        <MobileTabBar active="spec" />
      </div>
    </>
  )
}

function QueryBody({
  log,
  steps,
  citations,
  pending,
  saved,
  queryError,
  mobile = false,
}: {
  log: QueryLogDetail
  steps: readonly StreamStep[]
  citations: readonly Citation[]
  pending: boolean
  saved: boolean
  queryError: string | null
  mobile?: boolean
}) {
  const lastIsText = steps[steps.length - 1]?.kind === "text"
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col",
        mobile ? "gap-3.5" : "max-w-[820px] gap-[18px]",
      )}
    >
      {/* 헤더 블록 */}
      <div className={cn("flex w-full flex-col", mobile ? "gap-2.5" : "gap-3")}>
        <div className="flex w-full items-center gap-3">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[9px] bg-input",
              mobile ? "size-[26px]" : "size-[30px]",
            )}
          >
            <MessageCircle
              className={cn("text-ink-secondary", mobile ? "size-3" : "size-[15px]")}
            />
          </span>
          <span
            className={cn(
              "pen-text font-semibold tracking-[-0.2px] text-ink",
              mobile ? "text-[13.5px]" : "text-[14px]",
            )}
          >
            Query
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-[7px] rounded-full bg-separator" />
            <span
              className={cn(
                "pen-text font-medium tracking-[-0.12px] text-ink-secondary",
                mobile ? "text-[11.5px]" : "text-[12.5px]",
              )}
            >
              logged
            </span>
          </span>
          <span className="h-px flex-1" />
          <span
            className={cn(
              "pen-text shrink-0 tracking-[-0.12px] text-ink-tertiary",
              mobile ? "text-[11.5px]" : "text-[12.5px]",
            )}
          >
            {mobile
              ? relativeTime(log.created_at)
              : `${relativeTime(log.created_at)} · ${formatDateTime(log.created_at)}`}
          </span>
        </div>
        <h2
          className={cn(
            "pen-text m-0 w-full font-display font-semibold tracking-[-0.4px] text-ink",
            mobile ? "text-[18px] leading-[1.3]" : "text-[23px] leading-[1.25]",
          )}
        >
          {log.question}
        </h2>
        <div className="flex w-full flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-input",
                mobile ? "size-5" : "size-[22px]",
              )}
            >
              <span
                className={cn(
                  "pen-text font-semibold text-ink-secondary",
                  mobile ? "text-[8px]" : "text-[8.5px]",
                )}
              >
                {actorInitials(log.member.name)}
              </span>
            </span>
            <span
              className={cn(
                "pen-text tracking-[-0.2px] text-ink",
                mobile ? "text-[12.5px]" : "text-[13px]",
              )}
            >
              {log.member.name}
            </span>
          </span>
          <span className="size-[3px] rounded-full bg-separator" />
          <span className="flex items-center gap-[5px] rounded-[5px] bg-input px-2 py-[3px]">
            <GitBranchIcon className="size-2.5 text-ink-tertiary" />
            <span className="pen-text font-mono text-[11px] text-ink-secondary">{log.branch}</span>
          </span>
          <span className="size-[3px] rounded-full bg-separator" />
          <span className="pen-text font-mono text-[11.5px] text-ink-secondary">
            {log.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* 답변 카드 */}
      <article
        aria-live="polite"
        aria-busy={pending}
        className={cn(
          "flex w-full flex-col rounded-[16px] bg-surface shadow-[0_2px_12px_#0000000F]",
          mobile ? "gap-3 p-4" : "gap-3.5 px-[26px] py-[22px]",
        )}
      >
        <div className="flex items-center gap-[7px]">
          <Sparkles
            className={cn("size-3.5 text-accent", pending && !lastIsText && "animate-pulse")}
          />
          <span className="pen-text text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
            specraft
          </span>
          <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
            {pending
              ? lastIsText
                ? "· 응답 중…"
                : "· 문서 탐색 중…"
              : saved
                ? "· wiki 탐색 후 응답"
                : "· wiki 탐색 후 재생성"}
          </span>
          {pending && !lastIsText && (
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          )}
        </div>

        {steps.length > 0 ? (
          <StepTimeline steps={steps} streaming={pending} compact={mobile} />
        ) : pending ? (
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
            질문을 현재 브랜치({log.branch})에서 다시 실행하는 중입니다…
          </span>
        ) : (
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
            기록된 답변이 없습니다.
          </span>
        )}

        {citations.length > 0 && (
          <>
            <span
              className={cn(
                "pen-text font-semibold tracking-[0.8px] text-ink-tertiary",
                mobile ? "text-[9.5px]" : "text-[10px]",
              )}
            >
              CITATIONS · {citations.length}
            </span>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation) =>
                mobile ? (
                  <MobileCit key={citationLabel(citation)} text={citationLabel(citation)} />
                ) : (
                  <Cit key={citationLabel(citation)} text={citationLabel(citation)} />
                ),
              )}
            </div>
          </>
        )}

        {queryError && <span className="pen-text text-[13px] text-danger">{queryError}</span>}

        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
          {saved
            ? `query_id ${log.id.slice(0, 8)} · ${log.branch} · query 로그에 기록됨`
            : `query_id ${log.id.slice(0, 8)} · ${log.branch} · 원 질문을 현재 wiki 기준으로 재생성한 결과입니다`}
        </span>
      </article>
    </div>
  )
}

function QuerySkeleton({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col",
        mobile ? "gap-3.5" : "max-w-[820px] gap-[18px]",
      )}
      aria-hidden
    >
      <div className="flex w-full flex-col gap-3">
        <div className="h-[30px] w-32 animate-pulse rounded-[9px] bg-surface" />
        <div
          className={cn("animate-pulse rounded-sm bg-surface", mobile ? "h-6 w-4/5" : "h-7 w-3/4")}
        />
        <div className="h-5 w-48 animate-pulse rounded-sm bg-surface" />
      </div>
      <div
        className={cn("w-full animate-pulse rounded-[16px] bg-surface", mobile ? "h-60" : "h-72")}
      />
    </div>
  )
}

function QueryDetailError({
  message,
  onRetry,
  mobile = false,
}: {
  message: string
  onRetry: () => void
  mobile?: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 py-12">
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
          query를 불러오지 못했습니다
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

function QueryDetailNotFound({ onBack, mobile = false }: { onBack: () => void; mobile?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 py-12">
      <span className="flex size-14 items-center justify-center rounded-[28px] bg-input">
        <AlertTriangle className="size-6 text-ink-tertiary" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        <span
          className={cn(
            "pen-text font-semibold tracking-[-0.24px] text-ink",
            mobile ? "text-[14px]" : "text-[15px]",
          )}
        >
          해당 query를 찾을 수 없습니다
        </span>
        <span className="pen-text max-w-[420px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          기록이 보존 기간을 지났거나 잘못된 링크일 수 있습니다.
        </span>
      </div>
      <ButtonSecondary onClick={onBack}>Activity로 돌아가기</ButtonSecondary>
    </div>
  )
}
