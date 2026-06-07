import { Eye, EyeOff } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { cn } from "../lib/cn.js"
import { IconButton } from "./IconButton.js"

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
  /** 브라우저 자동완성 힌트 (email / current-password / new-password 등) */
  autoComplete?: string
  /** 최소 입력 길이 — input minLength 로 전달 */
  minLength?: number
  /** 진입 즉시 포커스 — 폼 첫 필드에 지정 */
  autoFocus?: boolean
  /** 폼 필드 식별자 — 자격증명 자동완성/저장 그룹핑 */
  name?: string
  inputClassName?: string
  className?: string
}

/**
 * component/Field — 라벨 12.5/500 + 인풋(데스크톱 36px·radius-s·#F5F5F7, 모바일 44px·radius 10).
 * onChange 가 주어지면 controlled, 없으면 defaultValue 로 uncontrolled 동작.
 * password 타입은 trailing 이 따로 없으면 표시/숨김 토글(Eye/EyeOff)을 자동 제공한다.
 */
export function Field({
  label,
  placeholder,
  value,
  onChange,
  children,
  trailing,
  type = "text",
  autoComplete,
  minLength,
  autoFocus,
  name,
  inputClassName,
  className,
}: FieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === "password"
  // password 입력은 토글 상태에 따라 text↔password 로 전환, 그 외에는 지정 타입 유지
  const inputType = isPassword && revealed ? "text" : type
  // 직접 trailing 이 주어지지 않은 password 필드에는 표시/숨김 토글을 기본 제공
  const passwordToggle =
    isPassword && trailing === undefined ? (
      <IconButton
        icon={revealed ? EyeOff : Eye}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        onClick={() => setRevealed((shown) => !shown)}
      />
    ) : null

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink"
      >
        {label}
      </label>
      <span
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-[10px] bg-bg px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-accent md:h-9 md:rounded-sm md:px-3",
          inputClassName,
        )}
      >
        {children ?? (
          <input
            id={id}
            name={name}
            aria-label={label}
            type={inputType}
            placeholder={placeholder}
            autoComplete={autoComplete}
            minLength={minLength}
            // biome-ignore lint/a11y/noAutofocus: 인증 폼 첫 필드의 의도된 초기 포커스 — 사용처가 명시적으로 지정할 때만 적용된다.
            autoFocus={autoFocus}
            {...(type === "email"
              ? { spellCheck: false, autoCapitalize: "none", autoCorrect: "off" }
              : {})}
            {...(onChange
              ? { value: value ?? "", onChange: (event) => onChange(event.currentTarget.value) }
              : { defaultValue: value })}
            className="pen-text w-full min-w-0 border-none bg-transparent text-[14px] tracking-[-0.22px] text-ink outline-none placeholder:text-ink-tertiary max-md:text-[16px] md:text-[13px] md:tracking-[-0.2px]"
          />
        )}
        {trailing ?? passwordToggle}
      </span>
    </div>
  )
}
