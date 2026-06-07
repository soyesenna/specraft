import { GitMerge, Loader2, Sparkles } from "lucide-react"
import { cn } from "../lib/cn.js"

type DirectiveBarProps = {
  placeholder?: string
  /** 헬퍼 라인 숨김 (모바일 M08b는 바만) */
  helper?: boolean
  className?: string
  /** controlled 입력값 */
  value?: string
  /** 입력 변경 핸들러 */
  onChange?: (value: string) => void
  /** 전송(Enter·git-merge 버튼) 핸들러 */
  onSubmit?: () => void
  /** 입력·전송 비활성화 */
  disabled?: boolean
  /** 재병합 진행 중 — 전송 버튼을 스피너로 교체하고 비활성화 */
  pending?: boolean
}

/**
 * component/Directive Bar — conflict 병합 자연어 지시 플로팅 입력.
 * pill 캡슐(0 6px 24px 섀도) + sparkles + 32px accent 전송 버튼, 하단 헬퍼 캡션.
 */
export function DirectiveBar({
  placeholder = '병합 방법을 자연어로 지시하세요 — 예: "dev의 TTL 300초를 기본으로 유지해줘"',
  helper = true,
  className,
  value,
  onChange,
  onSubmit,
  disabled = false,
  pending = false,
}: DirectiveBarProps) {
  return (
    <div className={cn("flex w-full flex-col items-center gap-1.5", className)}>
      <div className="flex w-full items-center gap-2.5 rounded-pill bg-surface py-[7px] pr-[7px] pl-4 shadow-[0_6px_24px_#00000026] focus-within:ring-2 focus-within:ring-accent">
        <Sparkles className="size-3.5 shrink-0 text-accent" />
        <input
          type="text"
          value={value}
          onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
          onKeyDown={
            onSubmit
              ? (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    onSubmit()
                  }
                }
              : undefined
          }
          disabled={disabled}
          placeholder={placeholder}
          aria-label="병합 지시 입력"
          className="pen-text w-full min-w-0 border-none bg-transparent text-[13.5px] tracking-[-0.2px] text-ink outline-none placeholder:text-ink-tertiary"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || pending}
          aria-busy={pending}
          className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-accent transition-[filter,transform] duration-150 ease-[var(--ease-standard)] active:scale-95 active:brightness-90 disabled:opacity-60"
          aria-label="병합 지시 전송"
        >
          {pending ? (
            <Loader2 className="size-[15px] animate-spin text-white" />
          ) : (
            <GitMerge className="size-[15px] text-white" />
          )}
        </button>
      </div>
      {helper && (
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          모든 멤버가 지시할 수 있습니다 · Merge Agent가 재병합을 시도합니다
        </span>
      )}
    </div>
  )
}
