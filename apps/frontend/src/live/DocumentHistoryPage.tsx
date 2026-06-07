import type { WikiVersion } from "@specraft/shared"
import { Check, ChevronDown, ChevronLeft, GitMerge, History } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { SelectCard } from "../components/SelectCard.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"
import { actorInitials, relativeTime } from "./DocumentPage.js"
import { LiveShell } from "./LiveShell.js"

function decodeDocId(docId: string | undefined): string {
  if (!docId) {
    return "overview.md"
  }
  try {
    return decodeURIComponent(docId)
  } catch {
    return docId
  }
}

function fileLabel(path: string): string {
  const segments = path.split("/")
  return segments[segments.length - 1] ?? path
}

function shortHash(hash: string): string {
  return hash.slice(0, 7)
}

/** 동일 내용 라인에도 안정 키 부여 (index 키 회피) */
function keyedLines(prefix: string, lines: readonly string[]): { key: string; line: string }[] {
  const seen = new Map<string, number>()
  return lines.map((line) => {
    const count = seen.get(line) ?? 0
    seen.set(line, count + 1)
    return { key: `${prefix}:${line}#${count}`, line }
  })
}

/** 병합 커밋(요약에 'merge'/'병합' 포함) 추정 — 디자인 MERGE 배지 */
function versionBadge(version: WikiVersion): "MERGE" | "INIT" | undefined {
  const summary = version.summary.toLowerCase()
  if (summary.includes("merge") || version.summary.includes("병합")) {
    return "MERGE"
  }
  if (summary.includes("init") || version.summary.includes("초기")) {
    return "INIT"
  }
  return undefined
}

/** 05b · Document — History (AGh5N) + M05b/M05c (B7Jv9/d5poe) — 디자인 충실 + 실데이터 */
export function DocumentHistoryPage() {
  const { client } = useSpecraft()
  const { selectedBranch } = useBranch()
  const navigate = useNavigate()
  const { docId } = useParams()
  const path = decodeDocId(docId)
  const docHref = `/specs/doc/${encodeURIComponent(path)}`

  const [versions, setVersions] = useState<readonly WikiVersion[]>([])
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    void client
      .wikiHistory({ branch: selectedBranch, path })
      .then((response) => {
        if (active) {
          setVersions(response.versions)
          setSelectedHash(response.versions[0]?.commit_hash ?? null)
          setError(null)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Failed to load wiki history")
        }
      })
    return () => {
      active = false
    }
  }, [client, selectedBranch, path])

  const selected = useMemo(
    () => versions.find((version) => version.commit_hash === selectedHash) ?? versions[0] ?? null,
    [versions, selectedHash],
  )
  const latestHash = versions[0]?.commit_hash ?? null
  const selectedIndex = selected
    ? versions.findIndex((version) => version.commit_hash === selected.commit_hash)
    : -1
  const previous = selectedIndex >= 0 ? versions[selectedIndex + 1] : undefined
  const addedLines = useMemo(() => keyedLines("add", selected?.added ?? []), [selected])
  const removedLines = useMemo(() => keyedLines("rem", selected?.removed ?? []), [selected])

  function selectVersion(hash: string): void {
    setSelectedHash(hash)
    setVersionMenuOpen(false)
  }
  function resetToLatest(): void {
    if (latestHash) {
      setSelectedHash(latestHash)
    }
    setVersionMenuOpen(false)
  }

  const diffMeta = selected
    ? `${path} · 이 버전 ${shortHash(selected.commit_hash)}${
        previous ? ` · 이전 ${shortHash(previous.commit_hash)} 대비` : ""
      } +${selected.added_lines} −${selected.removed_lines}`
    : path
  const bannerText = selected
    ? `버전 ${shortHash(selected.commit_hash)}을 보는 중 — ${selected.author}의 ingest · ${relativeTime(selected.timestamp)}`
    : "버전을 불러오는 중"

  return (
    <>
      {/* ───── 데스크톱 05b ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title=""
          titlePrefix={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(docHref)}
                className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input"
                aria-label="뒤로"
              >
                <ChevronLeft className="size-[15px] text-ink-secondary" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                  specs /
                </span>
                <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                  {fileLabel(path)}
                </span>
              </div>
              <div className="flex items-center gap-[5px] rounded-pill bg-dark-card px-2.5 py-1">
                <History className="size-[11px] text-white" />
                <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-white">
                  History
                </span>
              </div>
            </div>
          }
          titleRight={
            <button
              type="button"
              onClick={() => navigate(docHref)}
              className="flex items-center justify-center gap-1.5 rounded-sm bg-accent px-4 py-2"
            >
              <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Done</span>
            </button>
          }
        >
          <div className="flex min-h-0 w-full flex-1 gap-[22px] px-7 pb-7">
            {/* Doc Sheet (버전 뷰) */}
            <article className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto rounded-lg bg-surface px-10 py-7">
              <div className="flex w-full items-center gap-2 rounded-sm bg-bg px-3.5 py-[9px]">
                <History className="size-[13px] shrink-0 text-ink-tertiary" />
                <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
                  {bannerText}
                </span>
                <span className="h-px flex-1" />
                {selected && latestHash && selected.commit_hash !== latestHash && (
                  <button
                    type="button"
                    onClick={resetToLatest}
                    className="pen-text shrink-0 text-[12.5px] font-medium tracking-[-0.12px] text-link"
                  >
                    최신 버전으로
                  </button>
                )}
              </div>
              <h1 className="pen-text m-0 w-full font-display text-[26px] leading-[1.18] font-semibold tracking-[-0.38px] text-ink">
                {fileLabel(path)}
              </h1>
              <span className="pen-text w-full text-[12px] tracking-[-0.12px] text-ink-tertiary">
                {diffMeta}
              </span>
              <div className="h-px w-full shrink-0 bg-hairline" />
              {error && <span className="pen-text text-[13px] text-danger">{error}</span>}
              {selected && selected.summary.length > 0 && (
                <p className="pen-text m-0 w-full text-[14px] leading-[1.65] tracking-[-0.22px] text-ink-secondary">
                  {selected.summary}
                </p>
              )}
              {selected && selected.added.length > 0 && (
                <div className="w-full overflow-hidden rounded-sm border border-[#34C759] bg-[#E9F6EE]">
                  <div className="flex w-full flex-col gap-1.5 px-3.5 py-2.5">
                    <span className="pen-text text-[9px] font-semibold tracking-[0.8px] text-[#1E8E3E]">
                      + ADDED
                    </span>
                    {addedLines.map((entry) => (
                      <span
                        key={entry.key}
                        className="pen-text w-full text-[13.5px] leading-[1.55] tracking-[-0.2px] text-ink-secondary"
                      >
                        {entry.line}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selected && selected.removed.length > 0 && (
                <div className="w-full overflow-hidden rounded-sm border border-[#FF3B30] bg-[#FBEEEC]">
                  <div className="flex w-full flex-col gap-1.5 px-3.5 py-2.5">
                    <span className="pen-text text-[9px] font-semibold tracking-[0.8px] text-[#C5221F]">
                      − REMOVED
                    </span>
                    {removedLines.map((entry) => (
                      <span
                        key={entry.key}
                        className="pen-text w-full text-[13.5px] leading-[1.55] tracking-[-0.2px] text-ink-tertiary"
                      >
                        {entry.line}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selected && selected.added.length === 0 && selected.removed.length === 0 && (
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">
                  이 버전의 diff 상세가 없습니다
                </span>
              )}
            </article>
            {/* History Panel */}
            <aside className="flex w-[360px] shrink-0 flex-col gap-2.5 overflow-y-auto">
              <div className="flex w-full flex-col gap-0.5 border border-hairline px-1">
                <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
                  History
                </span>
                <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  {path} · {versions.length} versions
                </span>
              </div>
              {versions.length === 0 && !error && (
                <span className="pen-text px-1 text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                  버전 이력이 없습니다
                </span>
              )}
              {versions.map((version) => {
                const badge = versionBadge(version)
                return (
                  <SelectCard
                    key={version.commit_hash}
                    selected={selected?.commit_hash === version.commit_hash}
                    onClick={() => selectVersion(version.commit_hash)}
                  >
                    <div className="flex w-full items-center gap-[7px]">
                      {badge === "MERGE" ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-dark-card">
                          <GitMerge className="size-[11px] text-white" />
                        </span>
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-input">
                          <span className="pen-text text-[8px] font-semibold text-ink-secondary">
                            {actorInitials(version.author)}
                          </span>
                        </span>
                      )}
                      <span className="pen-text truncate text-[12.5px] font-semibold tracking-[-0.12px] text-ink">
                        {version.author}
                      </span>
                      {badge && (
                        <span className="flex items-center rounded-[4px] bg-input px-[5px] py-px">
                          <span className="pen-text text-[8px] font-semibold tracking-[0.5px] text-ink-secondary">
                            {badge}
                          </span>
                        </span>
                      )}
                      <span className="h-px flex-1" />
                      <span className="pen-text shrink-0 text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                        {relativeTime(version.timestamp)}
                      </span>
                    </div>
                    <span className="pen-text w-full text-[12.5px] leading-[1.45] tracking-[-0.12px] text-ink-secondary">
                      {version.summary || shortHash(version.commit_hash)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center rounded-[4px] bg-bg px-1.5 py-0.5">
                        <span className="pen-text font-mono text-[9.5px] text-ink-secondary">
                          {shortHash(version.commit_hash)}
                        </span>
                      </span>
                      {version.added_lines > 0 && (
                        <span className="pen-text font-mono text-[10px] text-[#1E8E3E]">
                          +{version.added_lines}
                        </span>
                      )}
                      {version.removed_lines > 0 && (
                        <span className="pen-text font-mono text-[10px] text-[#C5221F]">
                          −{version.removed_lines}
                        </span>
                      )}
                    </div>
                  </SelectCard>
                )
              })}
            </aside>
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M05b/M05c ───── */}
      <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
          <button
            type="button"
            onClick={() => navigate(docHref)}
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-4 text-ink-secondary" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="pen-text text-[15.5px] font-semibold tracking-[-0.24px] text-ink">
              History
            </span>
            <span className="pen-text truncate text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
              {path} · {versions.length} versions
            </span>
          </div>
          {selected && (
            <span className="flex items-center gap-1 rounded-pill bg-dark-card px-[9px] py-1">
              <History className="size-2.5 text-white" />
              <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-white">
                {shortHash(selected.commit_hash)}
              </span>
            </span>
          )}
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 px-4 pb-4">
          {/* Version Banner — 드롭다운 트리거 */}
          <button
            type="button"
            onClick={() => setVersionMenuOpen((open) => !open)}
            className="flex w-full items-center gap-[7px] rounded-[10px] bg-surface px-3 py-[9px] text-left"
          >
            <History className="size-3 shrink-0 text-ink-tertiary" />
            <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-secondary">
              {selected
                ? `버전 ${shortHash(selected.commit_hash)}을 보는 중 — ${selected.author} · ${relativeTime(selected.timestamp)}`
                : "버전 선택"}
            </span>
            <ChevronDown className="size-[13px] shrink-0 text-ink-tertiary" />
            <span className="h-px flex-1" />
            {selected && latestHash && selected.commit_hash !== latestHash && (
              <span className="pen-text shrink-0 text-[11.5px] font-medium tracking-[-0.1px] text-link">
                최신으로
              </span>
            )}
          </button>
          {/* Diff Sheet */}
          <article className="flex w-full flex-col gap-[9px] rounded-md bg-surface px-4 py-3.5">
            <h1 className="pen-text m-0 w-full font-display text-[17.5px] font-semibold tracking-[-0.28px] text-ink">
              {fileLabel(path)}
            </h1>
            <span className="pen-text w-full text-[10px] tracking-[-0.1px] text-ink-tertiary">
              {selected
                ? `${previous ? `이전 ${shortHash(previous.commit_hash)} 대비 ` : ""}+${selected.added_lines} −${selected.removed_lines}`
                : path}
            </span>
            <div className="h-px w-full shrink-0 bg-hairline" />
            {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
            {selected && selected.summary.length > 0 && (
              <span className="pen-text w-full text-[12.5px] leading-[1.55] tracking-[-0.12px] text-ink-secondary">
                {selected.summary}
              </span>
            )}
            {selected && selected.added.length > 0 && (
              <div className="flex w-full flex-col gap-[5px] rounded-sm bg-[#E9F6EE] px-3 py-[9px]">
                <span className="pen-text text-[8.5px] font-semibold tracking-[0.8px] text-[#1E8E3E]">
                  + ADDED
                </span>
                {addedLines.map((entry) => (
                  <span
                    key={`m-${entry.key}`}
                    className="pen-text w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-secondary"
                  >
                    {entry.line}
                  </span>
                ))}
              </div>
            )}
            {selected && selected.removed.length > 0 && (
              <div className="flex w-full flex-col gap-[5px] rounded-sm bg-[#FBEEEC] px-3 py-[9px]">
                <span className="pen-text text-[8.5px] font-semibold tracking-[0.8px] text-[#C5221F]">
                  − REMOVED
                </span>
                {removedLines.map((entry) => (
                  <span
                    key={`m-${entry.key}`}
                    className="pen-text w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary"
                  >
                    {entry.line}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
        {/* M05c — Version Menu 드롭다운 */}
        {versionMenuOpen && versions.length > 0 && (
          <div className="absolute top-[132px] left-4 z-40 flex w-[358px] flex-col gap-px rounded-md bg-surface p-1.5 shadow-[0_6px_24px_#00000030]">
            <div className="flex w-full items-center px-2.5 pt-[7px] pb-[5px]">
              <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
                VERSIONS
              </span>
              <span className="h-px flex-1" />
              <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
                {versions.length}
              </span>
            </div>
            {versions.map((version) => {
              const badge = versionBadge(version)
              const isSelected = selected?.commit_hash === version.commit_hash
              return (
                <button
                  key={version.commit_hash}
                  type="button"
                  onClick={() => selectVersion(version.commit_hash)}
                  className={cn(
                    "flex h-[38px] w-full items-center gap-[7px] rounded-[7px] px-2.5",
                    isSelected && "bg-bg",
                  )}
                >
                  {badge === "MERGE" ? (
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[9px] bg-dark-card">
                      <GitMerge className="size-2.5 text-white" />
                    </span>
                  ) : (
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[9px] bg-input">
                      <span className="pen-text text-[7.5px] font-semibold text-ink-secondary">
                        {actorInitials(version.author)}
                      </span>
                    </span>
                  )}
                  <span
                    className={cn(
                      "pen-text truncate text-[12px] tracking-[-0.12px] text-ink",
                      isSelected && "font-semibold",
                    )}
                  >
                    {version.author}
                  </span>
                  {badge && (
                    <span className="flex shrink-0 items-center rounded-[4px] bg-input px-[5px] py-px">
                      <span className="pen-text text-[7.5px] font-semibold tracking-[0.5px] text-ink-secondary">
                        {badge}
                      </span>
                    </span>
                  )}
                  <span className="pen-text shrink-0 font-mono text-[9.5px] text-ink-tertiary">
                    {shortHash(version.commit_hash)}
                  </span>
                  <span className="h-px flex-1" />
                  <span className="pen-text shrink-0 text-[10px] tracking-[-0.1px] text-ink-tertiary">
                    {relativeTime(version.timestamp)}
                  </span>
                  {isSelected && <Check className="size-[13px] shrink-0 text-accent" />}
                </button>
              )
            })}
            <div className="h-px w-full bg-hairline" />
            <div className="flex w-full px-2.5 py-1.5">
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
