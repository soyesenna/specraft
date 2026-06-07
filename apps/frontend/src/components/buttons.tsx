import { Loader2 } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../lib/cn.js"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  labelClassName?: string
}

/** component/Button Primary — accent 필, radius-s, 8×16 패딩, 14px 라벨 */
export function ButtonPrimary({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-accent px-4 py-2 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:active:scale-100",
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
        "flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-input px-4 py-2 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:active:scale-100",
        className,
      )}
      {...rest}
    >
      <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">{children}</span>
    </button>
  )
}

/** component/Button Pill — accent 필, pill radius, 11×22 패딩, 15px 라벨 */
export function ButtonPill({
  children,
  className,
  labelClassName,
  pending,
  disabled,
  ...rest
}: ButtonProps & { pending?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-accent px-[22px] py-[11px] transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:active:scale-100",
        className,
      )}
      {...rest}
    >
      {pending ? <Loader2 className="size-4 animate-spin text-white" /> : null}
      <span className={cn("pen-text text-[15px] tracking-[-0.25px] text-white", labelClassName)}>
        {children}
      </span>
    </button>
  )
}
