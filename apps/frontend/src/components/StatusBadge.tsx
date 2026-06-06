import { cn } from "../lib/cn.js"

export type StatusTone = "success" | "warning" | "danger" | "neutral"

const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-separator",
}

type StatusBadgeProps = {
  tone: StatusTone
  label: string
  /** 기본 7px 도트 — Sync Status 등 일부 컨텍스트는 6px */
  dotSize?: 6 | 7
  /** 기본 12px/500 ink-secondary — 오버라이드용 */
  labelClassName?: string
  className?: string
}

/** component/Status — 도트 + 라벨 */
export function StatusBadge({
  tone,
  label,
  dotSize = 7,
  labelClassName,
  className,
}: StatusBadgeProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("rounded-full", DOT_TONE[tone], dotSize === 7 ? "size-[7px]" : "size-1.5")}
      />
      <span
        className={cn(
          "pen-text text-[12px] font-medium tracking-[-0.12px] text-ink-secondary",
          labelClassName,
        )}
      >
        {label}
      </span>
    </div>
  )
}
