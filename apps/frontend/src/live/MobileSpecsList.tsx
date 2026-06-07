import type { WikiGraphNode } from "@specraft/shared"
import { ChevronRight, FileText } from "lucide-react"
import { cn } from "../lib/cn.js"
import { fileNameOf, isSkeleton } from "./specsGraphModel.js"

type MobileListProps = {
  readonly nodes: readonly WikiGraphNode[]
  readonly onOpenDoc: (path: string) => void
}

export function MobileList({ nodes, onOpenDoc }: MobileListProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-0.5 pb-3">
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        {nodes.map((node, i) => {
          const dark = isSkeleton(node)
          return (
            <button
              key={node.path}
              type="button"
              onClick={() => onOpenDoc(node.path)}
              className={cn(
                "flex h-[58px] w-full shrink-0 items-center gap-[11px] px-3.5 text-left",
                i < nodes.length - 1 && "border-b border-hairline",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-sm",
                  dark ? "bg-dark-card" : "bg-input",
                )}
              >
                <FileText
                  className={cn("size-[13px]", dark ? "text-white" : "text-ink-tertiary")}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="pen-text truncate text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                  {fileNameOf(node.path)}
                </span>
                <span className="pen-text truncate text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                  {node.summary || node.title}
                </span>
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-separator" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
