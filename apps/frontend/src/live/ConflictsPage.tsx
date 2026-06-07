import type { Conflict } from "@specraft/shared"
import { ChevronLeft, ChevronRight, GitMerge, Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { DirectiveBar } from "../components/DirectiveBar.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SelectCard } from "../components/SelectCard.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { LiveShell } from "./LiveShell.js"

const STATE_LABEL: Record<Conflict["state"], string> = {
  open: "Open",
  resolving: "Resolving",
  resolved: "Resolved",
}

const STATE_TONE: Record<Conflict["state"], { dot: string; text: string }> = {
  open: { dot: "bg-danger", text: "text-danger" },
  resolving: { dot: "bg-warning", text: "text-warning" },
  resolved: { dot: "bg-success", text: "text-success" },
}

/** "feat/query-cache → dev" — API branch + source_branch 로 병합 방향 표기 */
function mergeTitle(conflict: Conflict): string {
  return `${conflict.branch} → ${conflict.source_branch ?? "dev"}`
}

/** API에 파일/시간 필드가 없으므로 잠금 상태를 서브라인으로 표기 */
function conflictSub(conflict: Conflict): string {
  if (conflict.state === "resolved") {
    return "해결됨 · branch unlocked"
  }
  if (conflict.state === "resolving") {
    return "재병합 시도 중 · branch locked"
  }
  return "병합 실패 · branch locked"
}

export function ConflictsPage() {
  const { client } = useSpecraft()
  const { refresh } = useBranch()
  const [conflicts, setConflicts] = useState<readonly Conflict[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null)
  const [directive, setDirective] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client
      .listConflicts()
      .then((response) => {
        if (active) {
          setConflicts(response.conflicts)
          setSelectedId(response.conflicts[0]?.id ?? null)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load conflicts")
        }
      })
    return () => {
      active = false
    }
  }, [client])

  const selected = conflicts.find((conflict) => conflict.id === selectedId) ?? null
  const mobileDetail = conflicts.find((conflict) => conflict.id === mobileDetailId) ?? null
  const openCount = conflicts.filter((conflict) => conflict.state === "open").length
  const resolvingCount = conflicts.filter((conflict) => conflict.state === "resolving").length
  const resolvedCount = conflicts.filter((conflict) => conflict.state === "resolved").length

  async function resolve(target: Conflict | null): Promise<void> {
    if (!target || directive.trim().length === 0) {
      return
    }
    setError(null)
    try {
      const response = await client.resolveConflict({ id: target.id, directive })
      const next: Conflict = response.conflict ?? {
        ...target,
        state: response.status === "resolved" ? "resolved" : "open",
      }
      setConflicts((current) => current.map((item) => (item.id === next.id ? next : item)))
      setDirective("")
      refresh()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Resolve failed")
    }
  }

  return (
    <>
      {/* ───── 데스크톱 08 / 08b ───── */}
      <div className="relative hidden h-full md:block">
        <LiveShell
          title="Conflicts"
          titleMeta={
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
              {openCount} open · {resolvingCount} resolving · {resolvedCount} resolved
            </span>
          }
        >
          <div className="flex min-h-0 w-full flex-1 gap-[22px] px-7 pt-1 pb-7">
            {/* Conflict List */}
            <div className="flex w-[356px] shrink-0 flex-col gap-2.5 overflow-y-auto">
              {conflicts.map((conflict) => {
                const tone = STATE_TONE[conflict.state]
                return (
                  <SelectCard
                    key={conflict.id}
                    selected={selectedId === conflict.id}
                    onClick={() =>
                      setSelectedId((cur) => (cur === conflict.id ? null : conflict.id))
                    }
                    className={cn(conflict.state === "resolved" && "opacity-[0.72]")}
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
                          {STATE_LABEL[conflict.state]}
                        </span>
                        <span className="h-px flex-1" />
                      </div>
                      <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                        {mergeTitle(conflict)}
                      </span>
                      <span className="pen-text w-full text-[12px] tracking-[-0.12px] text-ink-tertiary">
                        {conflictSub(conflict)}
                      </span>
                    </div>
                  </SelectCard>
                )
              })}
            </div>
            {/* Detail / Empty */}
            {selected ? (
              <DesktopConflictDetail conflict={selected} error={error} />
            ) : (
              <EmptyPane />
            )}
          </div>
        </LiveShell>
        {selected && (
          <div className="absolute right-7 bottom-[37px] left-[434px] z-30">
            <DirectiveBar
              value={directive}
              onChange={setDirective}
              onSubmit={() => {
                void resolve(selected)
              }}
            />
          </div>
        )}
      </div>

      {/* ───── 모바일 M08 / M08b ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        {mobileDetail ? (
          <MobileConflictDetail
            conflict={mobileDetail}
            directive={directive}
            error={error}
            onDirectiveChange={setDirective}
            onSubmit={() => {
              void resolve(mobileDetail)
            }}
            onBack={() => setMobileDetailId(null)}
          />
        ) : (
          <>
            <MobileStatusBar />
            <div className="flex w-full flex-col gap-0.5 px-4 pt-2 pb-2.5">
              <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
                Conflicts
              </h1>
              <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                {openCount} open · {resolvingCount} resolving · {resolvedCount} resolved
              </span>
            </div>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-0.5 pb-3">
              {conflicts.map((conflict) => {
                const tone = STATE_TONE[conflict.state]
                return (
                  <SelectCard
                    key={conflict.id}
                    onClick={() => setMobileDetailId(conflict.id)}
                    unpadded
                    className={cn("shrink-0", conflict.state === "resolved" && "opacity-[0.72]")}
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
                            {STATE_LABEL[conflict.state]}
                          </span>
                          <span className="h-px flex-1" />
                        </div>
                        <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                          {mergeTitle(conflict)}
                        </span>
                        <span className="pen-text w-full truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                          {conflictSub(conflict)}
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

function DesktopConflictDetail({
  conflict,
  error,
}: {
  conflict: Conflict
  error: string | null
}) {
  const tone = STATE_TONE[conflict.state]
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-4 self-start rounded-lg bg-surface px-[26px] py-[22px]">
      <div className="flex w-full items-center gap-2.5">
        <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px] text-ink">
          {mergeTitle(conflict)}
        </span>
        <span className="flex items-center gap-1.5 rounded-pill bg-bg px-2.5 py-1">
          <span className={cn("size-[7px] rounded-full", tone.dot)} />
          <span className={cn("pen-text text-[11.5px] font-semibold tracking-[-0.1px]", tone.text)}>
            {STATE_LABEL[conflict.state]}
          </span>
        </span>
        <span className="h-px flex-1" />
        <span className="pen-text font-mono text-[11px] text-ink-tertiary">{conflict.id}</span>
      </div>
      <div className="flex w-full items-center gap-[9px] rounded-sm bg-bg px-3.5 py-2.5">
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
        {conflict.detail}
      </p>
      {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
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

function MobileConflictDetail({
  conflict,
  directive,
  error,
  onDirectiveChange,
  onSubmit,
  onBack,
}: {
  conflict: Conflict
  directive: string
  error: string | null
  onDirectiveChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}) {
  const tone = STATE_TONE[conflict.state]
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
            {mergeTitle(conflict)}
          </span>
          <span className="pen-text font-mono text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            {conflict.id}
          </span>
        </div>
        <span className="flex items-center gap-[5px] rounded-pill bg-bg px-[9px] py-1">
          <span className={cn("size-1.5 rounded-full", tone.dot)} />
          <span className={cn("pen-text text-[10.5px] font-semibold tracking-[-0.1px]", tone.text)}>
            {STATE_LABEL[conflict.state]}
          </span>
        </span>
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-24">
        <div className="flex w-full gap-2 rounded-[10px] bg-surface px-3 py-2.5">
          <span className="pt-0.5">
            <Lock className="size-3 text-danger" />
          </span>
          <span className="pen-text w-full text-[11.5px] leading-[1.5] tracking-[-0.1px] text-ink-secondary">
            이 브랜치의 context · query · ingest 요청은 해제 전까지 409로 거부됩니다.
          </span>
        </div>
        <div className="flex w-full flex-col gap-[11px] rounded-md bg-surface p-4">
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            LLM MERGE FAILURE
          </span>
          <p className="pen-text m-0 w-full text-[12.5px] leading-[1.6] tracking-[-0.12px] text-ink-secondary">
            {conflict.detail}
          </p>
        </div>
        {error && <span className="pen-text text-[12.5px] text-danger">{error}</span>}
      </div>
      <div className="absolute bottom-[21px] left-4 z-30 w-[358px]">
        <DirectiveBar
          placeholder="병합 방법을 자연어로 지시하세요…"
          value={directive}
          onChange={onDirectiveChange}
          onSubmit={onSubmit}
        />
      </div>
    </>
  )
}
