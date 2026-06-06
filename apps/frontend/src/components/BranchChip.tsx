import { ChevronDown } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "../lib/cn.js"
import { GitBranchIcon } from "./GitBranchIcon.js"

type BranchChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  branch: string
  /** 메뉴 열림 상태 — 04 화면 오버라이드(fill=$input-bg) */
  open?: boolean
}

/** component/Branch Chip — pill, surface 필, git-branch 13 + 이름 13/500 + chevron 13 */
export function BranchChip({ branch, open = false, className, ...rest }: BranchChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-[7px] rounded-pill px-[13px] py-[7px]",
        open ? "bg-input" : "bg-surface",
        className,
      )}
      {...rest}
    >
      <GitBranchIcon className="size-[13px] text-ink" />
      <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink">{branch}</span>
      <ChevronDown className="size-[13px] text-ink-tertiary" />
    </button>
  )
}
