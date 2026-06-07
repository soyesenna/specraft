import type { ReactNode } from "react"
import { cn } from "../lib/cn.js"

type FieldProps = {
  label: string
  /** 미입력 placeholder — ink-tertiary 톤 */
  placeholder?: string
  /** 입력된 값 — ink 톤 */
  value?: string
  /** controlled 입력 변경 핸들러 */
  onChange?: (value: string) => void
  /** 입력 대신 임의 콘텐츠(비밀번호 도트 등) */
  children?: ReactNode
  /** 인풋 우측 트레일링 요소 */
  trailing?: ReactNode
  type?: "text" | "email" | "password"
  inputClassName?: string
  className?: string
}

/**
 * component/Field — 라벨 12.5/500 + 인풋(데스크톱 36px·radius-s·#F5F5F7, 모바일 44px·radius 10).
 * onChange 가 주어지면 controlled, 없으면 defaultValue 로 uncontrolled 동작.
 */
export function Field({
  label,
  placeholder,
  value,
  onChange,
  children,
  trailing,
  type = "text",
  inputClassName,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
        {label}
      </span>
      <span
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-[10px] bg-bg px-3.5 md:h-9 md:rounded-sm md:px-3",
          inputClassName,
        )}
      >
        {children ?? (
          <input
            aria-label={label}
            type={type}
            placeholder={placeholder}
            {...(onChange
              ? { value: value ?? "", onChange: (event) => onChange(event.currentTarget.value) }
              : { defaultValue: value })}
            className="pen-text w-full min-w-0 border-none bg-transparent text-[14px] tracking-[-0.22px] text-ink outline-none placeholder:text-ink-tertiary md:text-[13px] md:tracking-[-0.2px]"
          />
        )}
        {trailing}
      </span>
    </div>
  )
}
