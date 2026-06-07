import {
  Activity,
  GitMerge,
  type LucideIcon,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Waypoints,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { cn } from "../lib/cn.js"

export type SidebarSection = "specs" | "query" | "activity" | "conflicts"

const ITEMS: Array<{ key: SidebarSection; icon: LucideIcon; label: string; to: string }> = [
  { key: "specs", icon: Waypoints, label: "Specs", to: "/specs" },
  { key: "query", icon: MessageCircle, label: "Query", to: "/query" },
  { key: "activity", icon: Activity, label: "Activity", to: "/activity" },
  { key: "conflicts", icon: GitMerge, label: "Conflicts", to: "/conflicts" },
]

type SidebarProps = {
  active: SidebarSection | null
  collapsed: boolean
  onToggle: () => void
  conflictCount?: number
}

/** 접힘/펼침 모핑 트랜지션 공통 클래스 — DESIGN.md §15 standard(300ms). */
const MORPH = "duration-300 ease-[var(--ease-standard)] motion-reduce:transition-none"

/**
 * component/Sidebar(216px) ↔ component/Sidebar Rail(64px, 접힘).
 * 선택 = 화이트 필 + ink 아이콘 + 600 라벨 (03/04 화면 오버라이드 패턴)
 *
 * 두 상태를 별도 트리로 갈아끼우지 않고 단일 트리에서 width/padding/라벨
 * max-width를 동시에 트랜지션해 부드럽게 모핑한다. 라벨·카운트 배지는
 * 폭 콜랩스 + 페이드로 사라지고, 레일 전용 요소(도트 배지·펼치기 토글)는
 * 페이드로 교차한다.
 */
export function Sidebar({ active, collapsed, onToggle, conflictCount = 1 }: SidebarProps) {
  // ?tooltip=<key> 딥링크 — 04b 디자인(레일 hover 툴팁 노출 상태) 재현용
  const [params] = useSearchParams()
  const forcedTooltip = params.get("tooltip")

  return (
    <nav
      aria-label="앱 사이드바"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-hairline",
        "transition-[width,padding,gap]",
        MORPH,
        collapsed ? "w-16 gap-1 px-[13px] pt-3.5 pb-2.5" : "w-[216px] gap-0.5 px-3 py-3.5",
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
              "group relative flex shrink-0 items-center px-[11px]",
              "transition-[background-color,color,width,height,border-radius]",
              MORPH,
              collapsed ? "h-[38px] w-[38px] rounded-[9px]" : "h-9 w-full rounded-[7px]",
              selected ? "bg-surface" : "hover:bg-hairline",
            )}
          >
            <Icon
              className={cn("size-[15px] shrink-0", selected ? "text-ink" : "text-ink-tertiary")}
            />
            {/* 라벨 — 접힘 시 폭·여백·투명도를 함께 콜랩스 */}
            <span
              aria-hidden={collapsed || undefined}
              className={cn(
                "min-w-0 overflow-hidden transition-[max-width,margin,opacity]",
                MORPH,
                collapsed ? "ml-0 max-w-0 opacity-0" : "ml-2.5 max-w-[130px] opacity-100",
              )}
            >
              <span
                className={cn(
                  "pen-text whitespace-nowrap text-[13px] tracking-[-0.2px]",
                  selected ? "font-semibold text-ink" : "text-ink-secondary",
                )}
              >
                {label}
              </span>
            </span>
            {key === "conflicts" && conflictCount > 0 && (
              <>
                <span className="h-px min-w-0 flex-1" />
                {/* 펼침 카운트 배지 — 접힘 시 폭 콜랩스 */}
                <span
                  aria-hidden={collapsed || undefined}
                  className={cn(
                    "flex justify-end overflow-hidden transition-[max-width,opacity]",
                    MORPH,
                    collapsed ? "max-w-0 opacity-0" : "max-w-[17px] opacity-100",
                  )}
                >
                  <span className="flex size-[17px] shrink-0 items-center justify-center rounded-[9px] bg-danger">
                    <span className="pen-text text-[9.5px] font-semibold text-white">
                      {conflictCount}
                    </span>
                  </span>
                </span>
                {/* 접힘 레일 도트 배지 — 페이드 교차 */}
                <span
                  className={cn(
                    "absolute top-[5px] left-[25px] size-[7px] rounded-full bg-danger transition-opacity",
                    MORPH,
                    collapsed ? "opacity-100" : "opacity-0",
                  )}
                />
              </>
            )}
            {/* 04b Hover Tooltip — 레일 우측 8px, 다크 캡션 (접힘 전용) */}
            {collapsed && (
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-1/2 left-[59px] z-50 flex -translate-y-1/2 items-center rounded-[6px] bg-dark-card px-2.5 py-[5px] whitespace-nowrap shadow-[0_2px_8px_#00000029] transition-[opacity,transform] duration-150 ease-[var(--ease-standard)]",
                  forcedTooltip === key
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                )}
              >
                <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-white">
                  {label}
                </span>
              </span>
            )}
          </Link>
        )
      })}
      <div className="w-full flex-1" />
      {/* 하단 상태 행 — 펼침: dot+라벨+접기 토글 한 행 / 접힘: dot 중앙, 그 아래 펼치기 토글 */}
      <div
        className={cn(
          "relative flex w-full shrink-0 items-center transition-[padding]",
          MORPH,
          collapsed ? "justify-center pb-[42px]" : "px-[11px] pb-1.5",
        )}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-success" />
        <span
          aria-hidden={collapsed || undefined}
          className={cn(
            "min-w-0 overflow-hidden transition-[max-width,margin,opacity]",
            MORPH,
            collapsed ? "ml-0 max-w-0 opacity-0" : "ml-1.5 max-w-[120px] opacity-100",
          )}
        >
          <span className="pen-text whitespace-nowrap text-[11px] tracking-[-0.1px] text-ink-tertiary">
            Server connected
          </span>
        </span>
        {/* 접힘 시 flex-1 스페이서가 dot 센터링을 깨지 않도록 펼침에만 성장 부여 */}
        <span className={cn("h-px min-w-0", !collapsed && "flex-1")} />
        {/* 접기 토글 (펼침 전용) — 접힘 시 폭 콜랩스 */}
        <span
          aria-hidden={collapsed || undefined}
          className={cn(
            "flex justify-end overflow-hidden transition-[max-width,opacity]",
            MORPH,
            collapsed ? "max-w-0 opacity-0" : "max-w-[26px] opacity-100",
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            tabIndex={collapsed ? -1 : 0}
            className="flex size-[26px] shrink-0 items-center justify-center rounded-[6px] transition-colors duration-150 ease-[var(--ease-standard)] hover:bg-hairline"
            aria-label="사이드바 접기"
          >
            <PanelLeftClose className="size-[15px] text-ink-tertiary" />
          </button>
        </span>
        {/* 펼치기 토글 (접힘 전용) — 도트 아래 38px, 페이드 교차 */}
        <button
          type="button"
          onClick={onToggle}
          tabIndex={collapsed ? 0 : -1}
          aria-hidden={!collapsed || undefined}
          className={cn(
            "-translate-x-1/2 absolute bottom-0 left-1/2 flex h-[38px] w-[38px] items-center justify-center rounded-[9px] transition-[opacity,background-color] hover:bg-hairline",
            MORPH,
            collapsed ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-label="사이드바 펼치기"
        >
          <PanelLeftOpen className="size-[15px] text-ink-tertiary" />
        </button>
      </div>
    </nav>
  )
}
