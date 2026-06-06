import { ChevronDown, Search, Waypoints } from "lucide-react"
import type { ReactNode } from "react"

type TopNavProps = {
  onAvatarClick?: (() => void) | undefined
  /** Profile Menu 등 절대배치 오버레이 (07 화면) */
  children?: ReactNode
}

/** component/TopNav — 48px 글래스 바: 브랜드 / 스페이서 / 검색·아바타·셰브런 */
export function TopNav({ onAvatarClick, children }: TopNavProps) {
  return (
    <header className="relative z-30 flex h-12 w-full shrink-0 items-center gap-10 border-b border-hairline bg-nav-glass px-7 backdrop-blur-[20px]">
      <div className="flex items-center gap-2">
        <Waypoints className="size-[17px] text-ink" />
        <span className="pen-text font-display text-[16px] font-semibold tracking-[-0.3px] text-ink">
          specraft
        </span>
      </div>
      <div className="h-px flex-1" />
      <div className="flex items-center gap-4">
        <Search className="size-[15px] text-[#000000C4]" />
        <button
          type="button"
          onClick={onAvatarClick}
          className="flex size-[26px] items-center justify-center rounded-[13px] bg-ink"
        >
          <span className="pen-text text-[10px] font-semibold tracking-[0.2px] text-white">SY</span>
        </button>
        <ChevronDown className="size-3 text-ink-tertiary" />
      </div>
      {children}
    </header>
  )
}
