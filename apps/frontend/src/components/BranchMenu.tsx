import { Check, Lock } from "lucide-react"
import { GitBranchIcon } from "./GitBranchIcon.js"
import { cn } from "../lib/cn.js"

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
}

/**
 * component/Branch Menu — BRANCHES 헤더 + 브랜치 행 + 미러링 푸터 드롭다운.
 * 선택 행 = #F5F5F7 필 + 600 + accent 체크. resolving = warning 도트, locked = danger 자물쇠.
 */
export function BranchMenu({ rows = BRANCH_ROWS, width = 264, className }: BranchMenuProps) {
  return (
    <div
      style={{ width }}
      className={cn(
        "flex flex-col gap-px rounded-m bg-surface p-1.5 shadow-[3px_5px_30px_#00000038]",
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
        return (
          <button
            key={row.name}
            type="button"
            className={cn(
              "flex h-[34px] w-full items-center gap-2 rounded-[7px] px-2.5",
              selected && "bg-bg",
            )}
          >
            <GitBranchIcon
              className={cn("size-[13px] shrink-0", selected ? "text-ink" : "text-ink-tertiary")}
            />
            <span
              className={cn(
                "pen-text text-[13px] tracking-[-0.2px] text-ink",
                selected && "font-semibold",
              )}
            >
              {row.name}
            </span>
            <span className="h-px flex-1" />
            {row.time && (
              <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                {row.time}
              </span>
            )}
            {selected && <Check className="size-3.5 text-accent" />}
            {row.state === "resolving" && <span className="size-[7px] rounded-full bg-warning" />}
            {row.state === "locked" && <Lock className="size-3 text-danger" />}
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
