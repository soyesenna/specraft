import { Activity, GitMerge, type LucideIcon, MessageCircle, Waypoints } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn.js"
import type { SidebarSection } from "./Sidebar.js"

const ITEMS: Array<{ key: SidebarSection; icon: LucideIcon; label: string; to: string }> = [
  { key: "specs", icon: Waypoints, label: "Specs", to: "/specs" },
  { key: "query", icon: MessageCircle, label: "Query", to: "/query" },
  { key: "activity", icon: Activity, label: "Activity", to: "/activity" },
  { key: "conflicts", icon: GitMerge, label: "Conflicts", to: "/conflicts" },
]

type GlassNavProps = {
  active: SidebarSection
  conflictBadge?: boolean
  className?: string
}

/**
 * component/Glass Nav — iOS 26 Liquid Glass 플로팅 캡슐 (358px, blur 28).
 * 선택 = 화이트 필 버블(0 2px 8px 섀도) + accent 아이콘/600 라벨.
 * 모바일 화면에서 absolute(x16, y702)로 탭바 위에 띄운다.
 */
export function GlassNav({ active, conflictBadge = true, className }: GlassNavProps) {
  return (
    <nav
      className={cn(
        "flex w-[358px] gap-0.5 rounded-pill border border-[#FFFFFFD9] bg-[#FFFFFFBF] p-1 shadow-[0_10px_28px_#00000021] backdrop-blur-[28px]",
        className,
      )}
    >
      {ITEMS.map(({ key, icon: Icon, label, to }) => {
        const selected = key === active
        return (
          <Link
            key={key}
            to={to}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex h-[46px] flex-1 flex-col items-center justify-center gap-0.5 rounded-pill transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
              selected ? "bg-white shadow-[0_2px_8px_#0000001F]" : "hover:bg-hairline",
            )}
          >
            <span className="relative size-5">
              <Icon
                strokeWidth={1.5}
                className={cn(
                  "absolute top-[1.5px] left-[1.5px] size-[17px]",
                  selected ? "text-accent" : "text-ink-secondary",
                )}
              />
              {key === "conflicts" && conflictBadge && (
                <span className="absolute -top-px left-[14.5px] size-[7px] rounded-full bg-danger" />
              )}
            </span>
            <span
              className={cn(
                "pen-text text-[10px]",
                selected ? "font-semibold text-accent" : "font-medium text-ink-secondary",
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
