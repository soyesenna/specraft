import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { BranchChip } from "../components/BranchChip.js"
import { BranchMenu } from "../components/BranchMenu.js"
import { DocSheet } from "../components/DocSheet.js"
import { GlassNav } from "../components/GlassNav.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SearchField } from "../components/SearchField.js"
import { type SpecsView, ViewSwitcher } from "../components/ViewSwitcher.js"
import { cn } from "../lib/cn.js"
import { useBranch } from "./branch.js"
import { MobileList } from "./MobileSpecsList.js"
import { buildLayout, docIdOf, fileNameOf, isSkeleton } from "./specsGraphModel.js"

type MobileSpecsProps = {
  readonly view: SpecsView
  readonly onViewChange: (view: SpecsView) => void
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly selectedNode: WikiGraphNode | null
  readonly query: string
  readonly onQueryChange: (value: string) => void
  readonly sheetOpen: boolean
  readonly onSheetOpen: (path: string) => void
  readonly onSheetClose: () => void
  readonly onOpenDoc: (path: string) => void
}

export function MobileSpecs({
  view,
  onViewChange,
  nodes,
  edges,
  selectedNode,
  query,
  onQueryChange,
  sheetOpen,
  onSheetOpen,
  onSheetClose,
  onOpenDoc,
}: MobileSpecsProps) {
  const { selectedBranch, branches, setBranch } = useBranch()
  const [branchOpen, setBranchOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const layout = useMemo(
    () =>
      buildLayout(nodes, edges, false, { width: 358, height: 520, nodeWidth: 138, nodeHeight: 52 }),
    [nodes, edges],
  )
  const connectedNames = selectedNode
    ? [
        ...new Set(
          edges
            .filter((edge) => edge.from === selectedNode.path || edge.to === selectedNode.path)
            .map((edge) => (edge.from === selectedNode.path ? edge.to : edge.from))
            .map(fileNameOf),
        ),
      ]
    : []

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg md:hidden">
      <MobileStatusBar />
      <MobileHeader
        branch={selectedBranch}
        branchOpen={branchOpen}
        onBranchToggle={() => setBranchOpen((open) => !open)}
        onSearchToggle={() => setSearchOpen((open) => !open)}
      />
      {searchOpen && (
        <div className="w-full px-4 pb-1.5">
          <SearchField
            placeholder="Search specs"
            value={query}
            onChange={onQueryChange}
            className="w-full"
          />
        </div>
      )}
      <div className="w-full px-4 pt-1 pb-2.5">
        <ViewSwitcher view={view} onChange={onViewChange} className="w-full" mobile />
      </div>
      {view === "graph" ? (
        <MobileGraph
          nodes={nodes}
          layout={layout}
          selectedNode={selectedNode}
          onSheetOpen={onSheetOpen}
        />
      ) : (
        <MobileList nodes={nodes} onOpenDoc={onOpenDoc} />
      )}
      <MobileTabBar active="spec" />
      <GlassNav active="specs" className="absolute bottom-[88px] left-4 z-20" />
      {view === "graph" && sheetOpen && selectedNode && (
        <DocSheet
          dir={selectedNode.dir}
          name={fileNameOf(selectedNode.path)}
          summary={selectedNode.summary || selectedNode.title}
          docId={docIdOf(selectedNode.path)}
          connected={connectedNames.slice(0, 2)}
          moreCount={Math.max(connectedNames.length - 2, 0)}
          onClose={onSheetClose}
          className="absolute top-[520px] left-2.5 z-30"
        />
      )}
      {branchOpen && (
        <div className="absolute top-[88px] left-[92px] z-40">
          <BranchMenu
            rows={branches}
            width={250}
            onSelect={(branch) => {
              setBranch(branch)
              setBranchOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

function MobileHeader({
  branch,
  branchOpen,
  onBranchToggle,
  onSearchToggle,
}: {
  readonly branch: string
  readonly branchOpen: boolean
  readonly onBranchToggle: () => void
  readonly onSearchToggle: () => void
}) {
  return (
    <div className="flex w-full items-center gap-2.5 px-4 py-2">
      <h1 className="pen-text m-0 font-display text-[24px] font-semibold tracking-[-0.4px] text-ink">
        Specs
      </h1>
      <BranchChip branch={branch} open={branchOpen} onClick={onBranchToggle} />
      <span className="h-px flex-1" />
      <button type="button" aria-label="검색" onClick={onSearchToggle}>
        <Search className="size-[18px] text-ink-secondary" />
      </button>
    </div>
  )
}

function MobileGraph({
  nodes,
  layout,
  selectedNode,
  onSheetOpen,
}: {
  readonly nodes: readonly WikiGraphNode[]
  readonly layout: ReturnType<typeof buildLayout>
  readonly selectedNode: WikiGraphNode | null
  readonly onSheetOpen: (path: string) => void
}) {
  return (
    <div className="min-h-0 w-full flex-1 overflow-hidden">
      <div className="relative mx-auto h-[520px] w-[358px]">
        <svg
          viewBox={layout.viewBox}
          width={layout.width}
          height={layout.height}
          className="pointer-events-none absolute top-0 left-0"
          aria-hidden
          role="presentation"
        >
          {layout.edges.map((edge, i) => {
            const active =
              selectedNode !== null &&
              (edge.from.node.path === selectedNode.path || edge.to.node.path === selectedNode.path)
            return (
              <line
                key={`medge-${i.toString()}`}
                x1={edge.from.cx}
                y1={edge.from.cy}
                x2={edge.to.cx}
                y2={edge.to.cy}
                stroke={active ? "#0071E3" : "#D2D2D7"}
                strokeWidth={active ? 2 : 1.5}
              />
            )
          })}
        </svg>
        {nodes.map((node) => {
          const entry = layout.nodes.find((item) => item.node.path === node.path)
          if (!entry) {
            return null
          }
          return (
            <MobileNode
              key={node.path}
              node={node}
              selected={selectedNode?.path === node.path}
              x={entry.x}
              y={entry.y}
              onSheetOpen={onSheetOpen}
            />
          )
        })}
      </div>
    </div>
  )
}

function MobileNode({
  node,
  selected,
  x,
  y,
  onSheetOpen,
}: {
  readonly node: WikiGraphNode
  readonly selected: boolean
  readonly x: number
  readonly y: number
  readonly onSheetOpen: (path: string) => void
}) {
  const dark = isSkeleton(node)
  return (
    <button
      type="button"
      onClick={() => onSheetOpen(node.path)}
      className={cn(
        "absolute flex flex-col gap-px overflow-hidden rounded-[9px] px-2.5 py-[7px] text-left shadow-[0_3px_14px_#00000017]",
        dark ? "bg-dark-card" : "bg-surface",
        selected && "border-[1.5px] border-accent",
      )}
      style={{ width: 138, left: x, top: y }}
    >
      <span
        className={cn(
          "pen-text text-[7.5px] font-semibold tracking-[0.5px]",
          dark ? "text-white-tertiary" : "text-ink-tertiary",
        )}
      >
        {node.dir}
      </span>
      <span
        className={cn(
          "pen-text truncate text-[11.5px] font-semibold tracking-[-0.1px]",
          dark ? "text-white" : "text-ink",
        )}
      >
        {fileNameOf(node.path)}
      </span>
    </button>
  )
}
