import { Check, Lock } from "lucide-react"
import { cn } from "../lib/cn.js"
import { GitBranchIcon } from "./GitBranchIcon.js"

export type BranchRow = {
  name: string
  time?: string
  state: "selected" | "normal" | "resolving" | "locked"
}

export const BRANCH_ROWS: BranchRow[] = [
  { name: "dev", time: "2분 전", state: "selected" },
  { name: "main", time: "어제", state: "normal" },
  { name: "feat/stop-gate", time: "2시간 전", state: "normal" },
  { name: "feat/auth-keys", time: "1시간 전", state: "resolving" },
  { name: "feat/query-cache", state: "locked" },
]

type BranchMenuProps = {
  rows?: BranchRow[]
  width?: number
  className?: string
  /** 행 선택 콜백 — 미지정 시 행은 비활성(정적 디자인 화면 호환) */
  onSelect?: (branch: string) => void
}

/**
 * component/Branch Menu — BRANCHES 헤더 + 브랜치 행 + 미러링 푸터 드롭다운.
 * 선택 행 = #F5F5F7 필 + 600 + accent 체크. resolving = warning 도트, locked = danger 자물쇠.
 */
export function BranchMenu({
  rows = BRANCH_ROWS,
  width = 264,
  className,
  onSelect,
}: BranchMenuProps) {
  return (
    <div
      style={{ width }}
      className={cn(
        "flex flex-col gap-px rounded-md bg-surface p-1.5 shadow-[3px_5px_30px_#00000038]",
        className,
      )}
    >
      <div className="flex w-full items-center px-2.5 pt-[7px] pb-[5px]">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          BRANCHES
        </span>
        <span className="h-px flex-1" />
        <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
          {rows.length}
        </span>
      </div>
      {rows.map((row) => {
        const selected = row.state === "selected"
        const locked = row.state === "locked"
        return (
          <button
            key={row.name}
            type="button"
            disabled={locked}
            aria-disabled={locked || undefined}
            onClick={onSelect && !locked ? () => onSelect(row.name) : undefined}
            className={cn(
              "flex h-[34px] w-full items-center gap-2 rounded-[7px] px-2.5",
              selected && "bg-bg",
              locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-hairline",
            )}
          >
            <GitBranchIcon
              className={cn("size-[13px] shrink-0", selected ? "text-ink" : "text-ink-tertiary")}
            />
            <span
              className={cn(
                "pen-text min-w-0 flex-1 truncate text-[13px] tracking-[-0.2px] text-ink",
                selected && "font-semibold",
              )}
            >
              {row.name}
            </span>
            {row.time && (
              <span className="pen-text shrink-0 text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                {row.time}
              </span>
            )}
            {selected && <Check className="size-3.5 shrink-0 text-accent" />}
            {row.state === "resolving" && (
              <span className="size-[7px] shrink-0 rounded-full bg-warning" />
            )}
            {locked && <Lock className="size-3 shrink-0 text-danger" />}
          </button>
        )
      })}
      <div className="h-px w-full bg-hairline" />
      <div className="flex w-full px-2.5 py-1.5">
        <span className="pen-text text-[10px] tracking-[-0.1px] text-ink-tertiary">
          코드 브랜치와 1:1 미러링 · 요청 시 동기화
        </span>
      </div>
    </div>
  )
}
