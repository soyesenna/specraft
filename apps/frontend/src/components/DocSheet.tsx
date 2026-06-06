import { FileText, X } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn.js"
import { Avatar } from "./Avatar.js"

type DocSheetProps = {
  dir?: string
  name?: string
  summary?: string
  meta?: string
  commit?: string
  connected?: string[]
  moreCount?: number
  onClose?: () => void
  className?: string
}

/**
 * component/Doc Sheet — 모바일 디태치드 플로팅 바텀시트 (370px, r22, 0 10px 30px 섀도).
 * 그래버 / 헤드(닫기) / 요약 / 메타 / CONNECTED 칩 / Open document 버튼.
 */
export function DocSheet({
  dir = "SPECS",
  name = "stop-gate.md",
  summary = "세션 종료를 차단하는 Stop 게이트의 3중 검사(clean · pushed · ingested)와 read-only 면제(D9) 규칙.",
  meta = "soyesenna · 2시간 전",
  commit = "a1b2c3d",
  connected = ["overview.md", "mcp-proxy.md"],
  moreCount = 2,
  onClose,
  className,
}: DocSheetProps) {
  return (
    <div
      className={cn(
        "flex w-[370px] flex-col gap-[11px] rounded-[22px] bg-surface px-[18px] pt-2 pb-4 shadow-[0_10px_30px_#00000030]",
        className,
      )}
    >
      <div className="flex w-full justify-center">
        <span className="h-[4.5px] w-9 rounded-[2.5px] bg-separator" />
      </div>
      <div className="flex w-full items-center gap-2.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            {dir}
          </span>
          <span className="pen-text font-display text-[18px] font-semibold tracking-[-0.28px] text-ink">
            {name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-bg"
          aria-label="닫기"
        >
          <X className="size-[13px] text-ink-tertiary" />
        </button>
      </div>
      <p className="pen-text m-0 w-full text-[12.5px] leading-[1.55] tracking-[-0.12px] text-ink-secondary">
        {summary}
      </p>
      <div className="flex w-full items-center gap-[7px]">
        <Avatar initials="SY" size={18} />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">{meta}</span>
        <span className="flex items-center rounded-[4px] bg-bg px-1.5 py-0.5">
          <span className="pen-text font-mono text-[9.5px] text-ink-secondary">{commit}</span>
        </span>
      </div>
      <div className="flex w-full items-center gap-1.5">
        <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
          CONNECTED
        </span>
        {connected.map((doc) => (
          <span key={doc} className="flex items-center gap-1 rounded-[6px] bg-bg px-2 py-[3px]">
            <FileText className="size-2.5 text-ink-tertiary" />
            <span className="pen-text text-[10.5px] tracking-[-0.1px] text-link">{doc}</span>
          </span>
        ))}
        {moreCount > 0 && (
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            +{moreCount}
          </span>
        )}
      </div>
      <Link
        to="/specs/doc/stop-gate"
        className="flex h-[46px] w-full items-center justify-center rounded-xl bg-accent"
      >
        <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
          Open document
        </span>
      </Link>
    </div>
  )
}
