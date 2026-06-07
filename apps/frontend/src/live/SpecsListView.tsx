import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { ChevronDown, ChevronRight, FileText, Waypoints } from "lucide-react"
import { useMemo } from "react"
import { Avatar } from "../components/Avatar.js"
import { cn } from "../lib/cn.js"
import {
  authorInitials,
  fileNameOf,
  isSkeleton,
  prefixOf,
  relativeUpdated,
} from "./specsGraphModel.js"

type DesktopListViewProps = {
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly onOpenDoc: (path: string) => void
}

export function DesktopListView({ nodes, edges, onOpenDoc }: DesktopListViewProps) {
  const linkCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of edges) {
      counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1)
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1)
    }
    return counts
  }, [edges])

  return (
    <div
      data-testid="specs-list-view"
      className="flex min-h-0 w-full flex-1 flex-col px-7 pt-1 pb-7"
    >
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-[38px] w-full shrink-0 items-center gap-3.5 border-b border-hairline px-5">
          <span className="w-6 shrink-0" />
          <HeaderCell className="w-[380px]">NAME</HeaderCell>
          <HeaderCell className="min-w-0 flex-1">SUMMARY</HeaderCell>
          <HeaderCell className="w-14">LINKS</HeaderCell>
          <span className="flex w-[110px] shrink-0 items-center gap-1">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              UPDATED
            </span>
            <ChevronDown className="size-2.5 text-ink-tertiary" />
          </span>
          <span className="w-7 shrink-0" />
          <span className="w-3.5 shrink-0" />
        </div>
        {nodes.map((node, i) => (
          <ListRow
            key={node.path}
            node={node}
            links={linkCount.get(node.path) ?? 0}
            last={i === nodes.length - 1}
            onOpenDoc={onOpenDoc}
          />
        ))}
      </div>
    </div>
  )
}

function HeaderCell({
  className,
  children,
}: {
  readonly className: string
  readonly children: string
}) {
  return (
    <span className={className}>
      <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
        {children}
      </span>
    </span>
  )
}

function ListRow({
  node,
  links,
  last,
  onOpenDoc,
}: {
  readonly node: WikiGraphNode
  readonly links: number
  readonly last: boolean
  readonly onOpenDoc: (path: string) => void
}) {
  const dark = isSkeleton(node)
  return (
    <button
      type="button"
      onClick={() => onOpenDoc(node.path)}
      className={cn(
        "flex h-12 w-full shrink-0 items-center gap-3.5 px-5 text-left",
        "transition-colors duration-150 ease-[var(--ease-standard)] hover:bg-hairline",
        !last && "border-b border-hairline",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-[6px]",
          dark ? "bg-dark-card" : "bg-input",
        )}
      >
        <FileText className={cn("size-3", dark ? "text-white" : "text-ink-tertiary")} />
      </span>
      <span className="flex w-[380px] shrink-0 items-center gap-0.5 overflow-hidden">
        {prefixOf(node.path) && (
          <span className="pen-text shrink-0 truncate text-[13px] tracking-[-0.2px] text-ink-tertiary">
            {prefixOf(node.path)}
          </span>
        )}
        <span className="pen-text min-w-0 truncate text-[13px] font-semibold tracking-[-0.2px] text-ink">
          {fileNameOf(node.path)}
        </span>
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="pen-text block truncate text-[13px] tracking-[-0.2px] text-ink-tertiary">
          {node.summary || node.title}
        </span>
      </span>
      <span className="flex w-14 shrink-0 items-center gap-[5px]">
        <Waypoints className="size-3 text-ink-tertiary" />
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
          {links}
        </span>
      </span>
      <span className="flex w-[110px] shrink-0 items-center">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {relativeUpdated(node.updated)}
        </span>
      </span>
      <span className="flex w-7 shrink-0 items-center">
        <Avatar initials={authorInitials(node.author)} size={24} />
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-separator" />
    </button>
  )
}
