import {
  Activity,
  GitMerge,
  type LucideIcon,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Waypoints,
} from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn.js"

export type SidebarSection = "specs" | "query" | "activity" | "conflicts"

const ITEMS: Array<{ key: SidebarSection; icon: LucideIcon; label: string; to: string }> = [
  { key: "specs", icon: Waypoints, label: "Specs", to: "/specs" },
  { key: "query", icon: MessageCircle, label: "Query", to: "/query" },
  { key: "activity", icon: Activity, label: "Activity", to: "/activity" },
  { key: "conflicts", icon: GitMerge, label: "Conflicts", to: "/conflicts" },
]

type SidebarProps = {
  active: SidebarSection
  collapsed: boolean
  onToggle: () => void
  conflictCount?: number
}

/**
 * component/Sidebar(216px) + component/Sidebar Rail(64px, 접힘).
 * 선택 = 화이트 필 + ink 아이콘 + 600 라벨 (03/04 화면 오버라이드 패턴)
 */
export function Sidebar({ active, collapsed, onToggle, conflictCount = 1 }: SidebarProps) {
  if (collapsed) {
    return (
      <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-hairline pt-3.5 pb-2.5">
        {ITEMS.map(({ key, icon: Icon, to }) => {
          const selected = key === active
          return (
            <Link
              key={key}
              to={to}
              className={cn(
                "relative flex h-[38px] w-[38px] items-center justify-center rounded-[9px]",
                selected && "bg-surface",
              )}
            >
              <Icon className={cn("size-4", selected ? "text-ink" : "text-ink-tertiary")} />
              {key === "conflicts" && conflictCount > 0 && (
                <span className="absolute top-[5px] left-[25px] size-[7px] rounded-full bg-danger" />
              )}
            </Link>
          )
        })}
        <div className="w-[38px] flex-1" />
        <span className="size-1.5 rounded-full bg-success" />
        <button
          type="button"
          onClick={onToggle}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px]"
          aria-label="사이드바 펼치기"
        >
          <PanelLeftOpen className="size-[15px] text-ink-tertiary" />
        </button>
      </nav>
    )
  }

  return (
    <nav className="flex h-full w-[216px] shrink-0 flex-col gap-0.5 border-r border-hairline px-3 py-3.5">
      {ITEMS.map(({ key, icon: Icon, label, to }) => {
        const selected = key === active
        return (
          <Link
            key={key}
            to={to}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-[7px] px-[11px]",
              selected && "bg-surface",
            )}
          >
            <Icon className={cn("size-[15px]", selected ? "text-ink" : "text-ink-tertiary")} />
            <span
              className={cn(
                "pen-text text-[13px] tracking-[-0.2px]",
                selected ? "font-semibold text-ink" : "text-ink-secondary",
              )}
            >
              {label}
            </span>
            {key === "conflicts" && conflictCount > 0 && (
              <>
                <span className="h-px flex-1" />
                <span className="flex size-[17px] items-center justify-center rounded-[9px] bg-danger">
                  <span className="pen-text text-[9.5px] font-semibold text-white">
                    {conflictCount}
                  </span>
                </span>
              </>
            )}
          </Link>
        )
      })}
      <div className="w-full flex-1" />
      <div className="flex w-full items-center gap-1.5 px-[11px] pb-1.5">
        <span className="size-1.5 rounded-full bg-success" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
          Server connected
        </span>
        <span className="h-px flex-1" />
        <button
          type="button"
          onClick={onToggle}
          className="flex size-[26px] items-center justify-center rounded-[6px]"
          aria-label="사이드바 접기"
        >
          <PanelLeftClose className="size-[15px] text-ink-tertiary" />
        </button>
      </div>
    </nav>
  )
}
