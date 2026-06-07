import type { LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "../lib/cn.js"

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
}

/** component/Icon Button — 28×28, r14, input 필, 15px ink-secondary 아이콘 */
export function IconButton({ icon: Icon, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-input transition duration-150 ease-[var(--ease-standard)] hover:brightness-95 active:scale-[0.97]",
        className,
      )}
      {...rest}
    >
      <Icon className="size-[15px] text-ink-secondary" />
    </button>
  )
}
