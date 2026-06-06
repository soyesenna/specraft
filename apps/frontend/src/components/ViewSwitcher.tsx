import { List, Waypoints } from "lucide-react"
import { cn } from "../lib/cn.js"

export type SpecsView = "graph" | "list"

type ViewSwitcherProps = {
  view: SpecsView
  onChange: (view: SpecsView) => void
  /** 모바일 변형 — 세그먼트가 fill·30px (M03/M04 오버라이드) */
  mobile?: boolean
  className?: string
}

/** component/View Switcher — r9 input 트랙(p2/gap2), 활성 세그 = surface + 1px 섀도 */
export function ViewSwitcher({ view, onChange, mobile = false, className }: ViewSwitcherProps) {
  const segment = (target: SpecsView, Icon: typeof Waypoints, label: string) => {
    const active = view === target
    return (
      <button
        type="button"
        onClick={() => onChange(target)}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-[7px] px-3",
          mobile ? "h-[30px] flex-1" : "py-[5px]",
          active && "bg-surface shadow-[0_1px_3px_#0000001F]",
        )}
      >
        <Icon className={cn("size-[13px]", active ? "text-ink" : "text-ink-tertiary")} />
        <span
          className={cn(
            "pen-text text-[12.5px] font-medium tracking-[-0.12px]",
            active ? "text-ink" : "text-ink-tertiary",
          )}
        >
          {label}
        </span>
      </button>
    )
  }

  return (
    <div className={cn("flex items-center gap-0.5 rounded-[9px] bg-input p-0.5", className)}>
      {segment("graph", Waypoints, "Graph")}
      {segment("list", List, "List")}
    </div>
  )
}
