import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { ArrowUpRight, FileText, Minus, Plus, Scan } from "lucide-react"
import { Avatar } from "../components/Avatar.js"
import { cn } from "../lib/cn.js"
import { authorInitials, fileNameOf, relativeUpdated } from "./specsGraphModel.js"

type ZoomControlsProps = {
  readonly onZoomIn?: () => void
  readonly onZoomOut?: () => void
  readonly onFit?: () => void
  readonly className?: string
}

export function ZoomControls({ onZoomIn, onZoomOut, onFit, className }: ZoomControlsProps) {
  return (
    <div
      className={cn(
        "absolute flex flex-col rounded-sm bg-surface shadow-[0_2px_8px_#00000014]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="확대"
      >
        <Plus className="size-3.5 text-ink-secondary" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="축소"
      >
        <Minus className="size-3.5 text-ink-secondary" />
      </button>
      <button
        type="button"
        onClick={onFit}
        className="flex h-8 w-[34px] items-center justify-center"
        aria-label="화면 맞춤"
      >
        <Scan className="size-3.5 text-ink-secondary" />
      </button>
    </div>
  )
}

type DetailPanelProps = {
  readonly node: WikiGraphNode
  readonly edges: WikiGraphResponse["edges"]
  readonly onOpenDoc: (path: string) => void
}

export function DetailPanel({ node, edges, onOpenDoc }: DetailPanelProps) {
  const connected = edges
    .filter((edge) => edge.from === node.path || edge.to === node.path)
    .map((edge) => (edge.from === node.path ? edge.to : edge.from))
  const uniqueConnected = [...new Set(connected)]

  return (
    <aside
      data-testid="specs-detail-panel"
      className="absolute top-5 right-5 z-20 flex w-[344px] flex-col gap-3.5 rounded-lg bg-surface p-[22px] shadow-[3px_5px_30px_#00000038]"
    >
      <div className="flex w-full flex-col gap-[5px]">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          {node.dir}
        </span>
        <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.3px] text-ink">
          {fileNameOf(node.path)}
        </span>
        <p className="pen-text m-0 w-full text-[13px] leading-[1.5] tracking-[-0.2px] text-ink-secondary">
          {node.summary || node.title}
        </p>
      </div>
      <div className="flex w-full items-center gap-2">
        <Avatar initials={authorInitials(node.author)} size={20} />
        <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
          {node.author ?? "—"} · {relativeUpdated(node.updated)}
        </span>
        <span className="h-px flex-1" />
        {node.commit && (
          <span className="rounded-[4px] bg-input px-[7px] py-0.5">
            <span className="pen-text font-mono text-[11px] text-ink-secondary">{node.commit}</span>
          </span>
        )}
      </div>
      <div className="h-px w-full bg-hairline" />
      <div className="flex w-full flex-col gap-2.5">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          CONNECTED · {uniqueConnected.length}
        </span>
        {uniqueConnected.map((doc) => (
          <button
            key={doc}
            type="button"
            onClick={() => onOpenDoc(doc)}
            className="flex w-full items-center gap-2 text-left"
          >
            <FileText className="size-[13px] shrink-0 text-ink-tertiary" />
            <span className="pen-text truncate text-[13px] tracking-[-0.2px] text-link">
              {fileNameOf(doc)}
            </span>
            <span className="h-px flex-1" />
            <ArrowUpRight className="size-[11px] shrink-0 text-ink-tertiary" />
          </button>
        ))}
      </div>
      <div className="h-px w-full bg-hairline" />
      <button
        type="button"
        onClick={() => onOpenDoc(node.path)}
        className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-accent px-4 py-2"
      >
        <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Open document</span>
      </button>
    </aside>
  )
}
