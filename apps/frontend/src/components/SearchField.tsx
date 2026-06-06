import { Search } from "lucide-react"
import { cn } from "../lib/cn.js"

type SearchFieldProps = {
  placeholder?: string
  className?: string
}

/** component/Search Field — 240×32, radius-s, input 필, search 14 + 13px placeholder */
export function SearchField({ placeholder = "Search specs", className }: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-[240px] items-center gap-[7px] rounded-s bg-input px-2.5",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0 text-ink-tertiary" />
      <input
        type="text"
        placeholder={placeholder}
        className="pen-text w-full min-w-0 border-none bg-transparent text-[13px] tracking-[-0.2px] text-ink outline-none placeholder:text-ink-tertiary"
      />
    </div>
  )
}
