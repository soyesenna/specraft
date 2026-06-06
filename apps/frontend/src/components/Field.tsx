import type { ReactNode } from "react"
import { cn } from "../lib/cn.js"

type FieldProps = {
  label: string
  /** 미입력 placeholder — ink-tertiary 톤 */
  placeholder?: string
  /** 입력된 값 — ink 톤 */
  value?: string
  /** 입력 대신 임의 콘텐츠(비밀번호 도트 등) */
  children?: ReactNode
  /** 인풋 우측 트레일링 요소 */
  trailing?: ReactNode
  type?: "text" | "email" | "password"
  inputClassName?: string
  className?: string
}

/** component/Field — 라벨 12.5/500 + 36px 인풋(radius-s, #F5F5F7 필) */
export function Field({
  label,
  placeholder,
  value,
  children,
  trailing,
  type = "text",
  inputClassName,
  className,
}: FieldProps) {
  return (
    <label className={cn("flex w-full flex-col gap-1.5", className)}>
      <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
        {label}
      </span>
      <span
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-sm bg-bg px-3",
          inputClassName,
        )}
      >
        {children ?? (
          <input
            type={type}
            placeholder={placeholder}
            defaultValue={value}
            className="pen-text w-full min-w-0 border-none bg-transparent text-[13px] tracking-[-0.2px] text-ink outline-none placeholder:text-ink-tertiary"
          />
        )}
        {trailing}
      </span>
    </label>
  )
}
