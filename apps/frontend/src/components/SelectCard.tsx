import type { ReactNode } from "react"
import { cn } from "../lib/cn.js"

type SelectCardProps = {
  /** 선택 — 2px accent 링 (conflict/version 카드 공통 문법) */
  selected?: boolean
  onClick?: () => void
  /** Card Slot 패딩(12×14)을 제거하고 직접 구성할 때 */
  unpadded?: boolean
  className?: string
  children: ReactNode
}

/** component/Select Card — radius-m 화이트 카드 + 선택 시 2px 블루 링. slot 콘텐츠 주입형 */
export function SelectCard({ selected, onClick, unpadded, className, children }: SelectCardProps) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-m bg-surface text-left",
        selected && "border-2 border-accent",
        className,
      )}
    >
      <div className={cn("flex w-full flex-col gap-[5px]", !unpadded && "px-3.5 py-3")}>
        {children}
      </div>
    </Tag>
  )
}
