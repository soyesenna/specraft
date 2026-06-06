import { cn } from "../lib/cn.js"

type SpecNodeProps = {
  dir: string
  name: string
  title: string
  /** 골격 문서(overview/index/log) — 블랙 카드 변형 */
  dark?: boolean
  /** 선택 — 2px accent 링 */
  selected?: boolean
  width: number
  x: number
  y: number
  onClick?: () => void
}

/**
 * component/Spec Node — 그래프 노드 카드 (radius-m, 0 4px 24px 섀도, 12×15 패딩).
 * 골격=dark-card 필 + white 텍스트, 선택=accent 2px stroke.
 */
export function SpecNode({ dir, name, title, dark, selected, width, x, y, onClick }: SpecNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width, left: x, top: y }}
      className={cn(
        "absolute flex flex-col gap-[3px] rounded-md px-[15px] py-3 text-left shadow-[0_4px_24px_#0000001F]",
        dark ? "bg-dark-card" : "bg-surface",
        selected && "border-2 border-accent",
      )}
    >
      <span
        className={cn(
          "pen-text text-[9.5px] font-semibold tracking-[0.8px]",
          dark ? "text-white-tertiary" : "text-ink-tertiary",
        )}
      >
        {dir}
      </span>
      <span
        className={cn(
          "pen-text w-full truncate text-[13px] font-semibold tracking-[-0.2px]",
          dark ? "text-white" : "text-ink",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "pen-text w-full truncate text-[11.5px] tracking-[-0.1px]",
          dark ? "text-white-tertiary" : "text-ink-tertiary",
        )}
      >
        {title}
      </span>
    </button>
  )
}
