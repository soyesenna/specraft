import { Search } from "lucide-react"
import { cn } from "../lib/cn.js"

type SearchFieldProps = {
  placeholder?: string
  /** controlled 값 — 미지정 시 비제어(정적 디자인 화면 호환) */
  value?: string
  onChange?: (value: string) => void
  className?: string
}

/** component/Search Field — 240×32, radius-s, input 필, search 14 + 13px placeholder */
export function SearchField({
  placeholder = "Search specs",
  value,
  onChange,
  className,
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-[240px] items-center gap-[7px] rounded-sm bg-input px-2.5 focus-within:ring-2 focus-within:ring-accent",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0 text-ink-tertiary" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="pen-text w-full min-w-0 border-none bg-transparent text-[13px] tracking-[-0.2px] text-ink outline-none max-md:text-[16px] placeholder:text-ink-tertiary"
      />
    </div>
  )
}
