import type { IngestLogDetail } from "@specraft/shared"
import { SpecraftHttpError } from "@specraft/shared"
import {
  AlertTriangle,
  ArrowUp,
  ChevronLeft,
  CircleCheck,
  Files,
  GitCommitHorizontal,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
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

/** created_at(ISO) → "2026-06-08 14:32" 절대 시각 라벨 */
function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const pad = (value: number): string => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** spec_change.type → git diff 스타일 배지 (added=A / modified=M / removed=D) */
const CHANGE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  added: { label: "A", bg: "bg-[#34C75924]", text: "text-[#1A7F37]" },
  modified: { label: "M", bg: "bg-[#FF950026]", text: "text-[#9A5B00]" },
  removed: { label: "D", bg: "bg-[#FF3B3024]", text: "text-danger" },
}

/**
 * 07a · Ingest Detail (UBiTY) + M07a (yyIJg) — 디자인 충실 + 저장된 상세 데이터.
 * getIngestLog(id)로 spec_changes/progress/open_questions까지 조회해 Changed documents를 복원한다.
 */
export function IngestDetailPage() {
  const { client } = useSpecraft()
  const navigate = useNavigate()
  const { id } = useParams()
  const [log, setLog] = useState<IngestLogDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey는 Retry 버튼이 동일 입력으로 재요청을 강제하는 트리거.
  useEffect(() => {
    let active = true
    setLog(null)
    setError(null)
    setNotFound(false)
    if (id === undefined) {
      setNotFound(true)
      return
    }
    void client
      .getIngestLog(id)
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
          setError(caught instanceof Error ? caught.message : "Failed to load ingest")
        }
      })
    return () => {
      active = false
    }
  }, [client, id, reloadKey])

  const retry = () => {
    setReloadKey((key) => key + 1)
  }

  const loading = log === null && error === null && !notFound

  const back = () => {
    navigate("/activity")
  }

  return (
    <>
      {/* ───── 데스크톱 07a ───── */}
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
                  Ingest {log ? log.commit_hash.slice(0, 7) : ""}
                </span>
              </div>
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pt-1 pb-7">
            {error ? (
              <DetailError message={error} onRetry={retry} />
            ) : notFound ? (
              <DetailNotFound onBack={back} />
            ) : loading || !log ? (
              <IngestSkeleton />
            ) : (
              <IngestBody log={log} />
            )}
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M07a ───── */}
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
          {error ? (
            <DetailError message={error} onRetry={retry} mobile />
          ) : notFound ? (
            <DetailNotFound onBack={back} mobile />
          ) : loading || !log ? (
            <IngestSkeleton mobile />
          ) : (
            <IngestBody log={log} mobile />
          )}
        </div>
        <MobileTabBar active="spec" />
      </div>
    </>
  )
}

/** 디자인 07a/M07a 본문 — 데스크톱/모바일 공유, mobile 플래그로 치수만 분기 */
function IngestBody({ log, mobile = false }: { log: IngestLogDetail; mobile?: boolean }) {
  const accepted = log.status === "accepted"
  return (
    <div className={cn("mx-auto flex w-full flex-col", mobile ? "gap-3" : "max-w-[880px] gap-5")}>
      {/* 헤더 블록 */}
      <div className={cn("flex w-full flex-col", mobile ? "gap-2.5" : "gap-3")}>
        <div className="flex w-full items-center gap-3">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[9px] bg-dark-card",
              mobile ? "size-[26px]" : "size-[30px]",
            )}
          >
            <ArrowUp className={cn("text-white", mobile ? "size-3" : "size-[15px]")} />
          </span>
          <span
            className={cn(
              "pen-text font-semibold tracking-[-0.2px] text-ink",
              mobile ? "text-[13.5px]" : "text-[14px]",
            )}
          >
            Ingest
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("size-[7px] rounded-full", accepted ? "bg-success" : "bg-danger")}
            />
            <span
              className={cn(
                "pen-text font-medium tracking-[-0.12px]",
                accepted ? "text-ink-secondary" : "text-danger",
                mobile ? "text-[11.5px]" : "text-[12.5px]",
              )}
            >
              {log.status}
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
            mobile ? "text-[19px] leading-[1.3]" : "text-[26px] leading-[1.2]",
          )}
        >
          {log.summary || "(요약 없음)"}
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
            {log.commit_hash.slice(0, 7)}
          </span>
        </div>
      </div>

      {/* Commit 카드 */}
      <section className="flex w-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_2px_12px_#0000000F]">
        <div className="flex w-full items-center gap-[9px] border-b border-hairline px-[18px] py-3.5">
          <GitCommitHorizontal className="size-4 shrink-0 text-ink-secondary" />
          <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
            Commit
          </span>
          <span className="flex items-center rounded-[6px] bg-input px-2 py-[3px]">
            <span className="pen-text font-mono text-[11px] text-ink-secondary">
              {log.commit_hash.slice(0, 7)}
            </span>
          </span>
          <span className="h-px flex-1" />
          {log.wiki_commit && (
            <span className="flex items-center gap-[5px]">
              <span className="pen-text text-[12px] tracking-[-0.1px] text-ink-tertiary">wiki</span>
              <span className="pen-text font-mono text-[11px] text-link">
                {log.wiki_commit.slice(0, 7)}
              </span>
            </span>
          )}
        </div>
        <div className="flex w-full flex-col gap-3 px-[18px] py-4">
          <MetaRow label="Branch" value={log.branch} mono />
          <MetaRow label="Source commit" value={log.commit_hash} mono />
          {log.wiki_commit && <MetaRow label="Wiki commit" value={log.wiki_commit} mono />}
          <MetaRow label="Author" value={log.member.name} />
          <MetaRow label="Ingested" value={formatDateTime(log.created_at)} />
        </div>
      </section>

      {/* Spec changes 카드 — ingest 입력의 변경 항목 (added/modified/removed) */}
      {log.spec_changes.length > 0 && (
        <section className="flex w-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_2px_12px_#0000000F]">
          <div className="flex w-full items-center gap-[9px] border-b border-hairline px-[18px] py-3.5">
            <Files className="size-4 shrink-0 text-ink-secondary" />
            <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
              Spec changes
            </span>
            <span className="flex items-center justify-center rounded-pill bg-input px-2 py-0.5">
              <span className="pen-text text-[11px] font-semibold text-ink-secondary">
                {log.spec_changes.length}
              </span>
            </span>
          </div>
          <div className="flex w-full flex-col">
            {log.spec_changes.map((change, index) => {
              const badge = CHANGE_BADGE[change.type] ?? CHANGE_BADGE["modified"]
              return (
                <div
                  key={`${change.area}-${index.toString()}`}
                  className={cn(
                    "flex w-full items-start gap-3 px-[18px] py-3",
                    index < log.spec_changes.length - 1 && "border-b border-hairline",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[19px] shrink-0 items-center justify-center rounded-[5px]",
                      badge?.bg,
                    )}
                  >
                    <span
                      className={cn("pen-text font-mono text-[11px] font-semibold", badge?.text)}
                    >
                      {badge?.label}
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="pen-text text-[13px] font-medium tracking-[-0.12px] text-ink">
                      {change.area}
                    </span>
                    <span className="pen-text text-[12px] leading-[1.5] tracking-[-0.1px] text-ink-secondary">
                      {change.description}
                    </span>
                    <span className="pen-text text-[11.5px] leading-[1.5] tracking-[-0.1px] text-ink-tertiary">
                      {change.reasoning}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Stop gate 카드 — status 기반 (accepted=passed / rejected=blocked) */}
      <section className="flex w-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_2px_12px_#0000000F]">
        <div className="flex w-full items-center gap-[9px] border-b border-hairline px-[18px] py-3.5">
          {accepted ? (
            <ShieldCheck className="size-4 shrink-0 text-ink-secondary" />
          ) : (
            <ShieldAlert className="size-4 shrink-0 text-danger" />
          )}
          <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
            Stop gate
          </span>
          <span className="h-px flex-1" />
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-pill px-2.5 py-1",
              accepted ? "bg-[#34C75924]" : "bg-[#FF3B3024]",
            )}
          >
            <span className={cn("size-1.5 rounded-full", accepted ? "bg-success" : "bg-danger")} />
            <span
              className={cn(
                "pen-text text-[12px] font-semibold tracking-[-0.12px]",
                accepted ? "text-[#1A7F37]" : "text-danger",
              )}
            >
              {accepted ? "passed" : "blocked"}
            </span>
          </span>
        </div>
        <div className="flex w-full flex-col px-[18px] py-2.5">
          {accepted ? (
            (
              [
                ["워킹 트리 clean 확인", "변경 없음"],
                ["HEAD가 원격에 push됨", log.commit_hash.slice(0, 7)],
                ["세션 ingest 마킹 완료", log.wiki_commit?.slice(0, 7) ?? log.id.slice(0, 8)],
              ] as const
            ).map(([label, note]) => (
              <div key={label} className="flex w-full items-center gap-2.5 py-[9px]">
                <CircleCheck className="size-4 shrink-0 text-success" />
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-secondary">
                  {label}
                </span>
                <span className="h-px flex-1" />
                <span className="pen-text font-mono text-[11px] text-ink-tertiary">{note}</span>
              </div>
            ))
          ) : (
            <div className="flex w-full items-start gap-2.5 py-2">
              <ShieldAlert className="mt-px size-4 shrink-0 text-danger" />
              <span className="pen-text text-[13px] leading-[1.5] tracking-[-0.2px] text-ink-secondary">
                ingest가 게이트에서 거부되어 wiki에 반영되지 않았습니다. commit → push → ingest
                절차를 다시 확인하세요.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="pen-text w-[120px] shrink-0 text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
        {label}
      </span>
      <span
        className={cn(
          "pen-text min-w-0 flex-1 truncate tracking-[-0.12px] text-ink-secondary",
          mono ? "font-mono text-[12px]" : "text-[13px]",
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** 로딩 스켈레톤 — 헤더 + 카드 2개 치수 보존 */
function IngestSkeleton({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={cn("mx-auto flex w-full flex-col", mobile ? "gap-3" : "max-w-[880px] gap-5")}
      aria-hidden
    >
      <div className="flex w-full flex-col gap-3">
        <div className="h-[30px] w-40 animate-pulse rounded-[9px] bg-surface" />
        <div
          className={cn("animate-pulse rounded-sm bg-surface", mobile ? "h-6 w-4/5" : "h-8 w-3/5")}
        />
        <div className="h-5 w-56 animate-pulse rounded-sm bg-surface" />
      </div>
      <div className="h-[180px] w-full animate-pulse rounded-lg bg-surface" />
      <div className="h-[170px] w-full animate-pulse rounded-lg bg-surface" />
    </div>
  )
}

/** DESIGN.md §14 Error — 아이콘 카드 + 제목 + 원인 + Retry */
function DetailError({
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
          ingest를 불러오지 못했습니다
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

/** 매칭되는 ingest가 없을 때 — 목록으로 복귀 CTA */
function DetailNotFound({ onBack, mobile = false }: { onBack: () => void; mobile?: boolean }) {
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
          해당 ingest를 찾을 수 없습니다
        </span>
        <span className="pen-text max-w-[420px] text-center text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          기록이 보존 기간을 지났거나 잘못된 링크일 수 있습니다.
        </span>
      </div>
      <ButtonSecondary onClick={onBack}>Activity로 돌아가기</ButtonSecondary>
    </div>
  )
}
