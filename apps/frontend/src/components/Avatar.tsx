import { cn } from "../lib/cn.js"

type AvatarProps = {
  initials: string
  /** 지름 px — 기본 24 (component/Avatar 정의) */
  size?: 18 | 20 | 24 | 26 | 28
  /** 다크 변형 — TopNav(26px ink 필)·모바일 탭바(dark-card 필) */
  dark?: boolean
  className?: string
}

const SIZE_TEXT: Record<number, string> = {
  18: "text-[7.5px]",
  20: "text-[8px]",
  24: "text-[9px]",
  26: "text-[10px]",
  28: "text-[10px]",
}

/** component/Avatar — 이니셜 원형. 라이트=input 필/ink-secondary, 다크=ink 필/white */
export function Avatar({ initials, size = 24, dark = false, className }: AvatarProps) {
  return (
    <span
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn(
        "flex shrink-0 items-center justify-center",
        dark ? "bg-ink" : "bg-input",
        className,
      )}
    >
      <span
        className={cn(
          "pen-text font-semibold",
          SIZE_TEXT[size],
          dark ? "tracking-[0.2px] text-white" : "text-ink-secondary",
        )}
      >
        {initials}
      </span>
    </span>
  )
}
