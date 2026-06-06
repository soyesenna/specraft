import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../lib/cn.js"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

/** component/Button Primary — accent 필, radius-s, 8×16 패딩, 14px 라벨 */
export function ButtonPrimary({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-s bg-accent px-4 py-2",
        className,
      )}
      {...rest}
    >
      <span className="pen-text text-[14px] tracking-[-0.22px] text-white">{children}</span>
    </button>
  )
}

/** component/Button Secondary — input 필, radius-s, 8×16 패딩, 14px ink 라벨 */
export function ButtonSecondary({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-s bg-input px-4 py-2",
        className,
      )}
      {...rest}
    >
      <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">{children}</span>
    </button>
  )
}

/** component/Button Pill — accent 필, pill radius, 11×22 패딩, 15px 라벨 */
export function ButtonPill({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-pill bg-accent px-[22px] py-[11px]",
        className,
      )}
      {...rest}
    >
      <span className="pen-text text-[15px] tracking-[-0.25px] text-white">{children}</span>
    </button>
  )
}
