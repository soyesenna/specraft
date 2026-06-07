import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { useMemo } from "react"
import { SpecNode } from "../components/SpecNode.js"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { DetailPanel, ZoomControls } from "./SpecsGraphDetailPanel.js"
import { buildLayout, fileNameOf, isSkeleton } from "./specsGraphModel.js"
import type { GraphViewport, ViewportUpdater } from "./specsGraphViewport.js"
import { useGraphViewport } from "./useGraphViewport.js"

type DesktopGraphCanvasProps = {
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly selectedNode: WikiGraphNode | null
  readonly viewport: GraphViewport
  readonly onViewportChange: ViewportUpdater
  readonly onSelectNode: (path: string) => void
  readonly onOpenDoc: (path: string) => void
  readonly onZoomOut: () => void
  readonly onZoomIn: () => void
  readonly onFit: () => void
}

export function DesktopGraphCanvas({
  nodes,
  edges,
  selectedNode,
  viewport,
  onViewportChange,
  onSelectNode,
  onOpenDoc,
  onZoomOut,
  onZoomIn,
  onFit,
}: DesktopGraphCanvasProps) {
  const collapsed = useSidebarCollapsed()
  const controls = useGraphViewport(viewport, onViewportChange)
  const layout = useMemo(() => buildLayout(nodes, edges, collapsed), [nodes, edges, collapsed])

  return (
    <div
      data-testid="specs-graph-canvas"
      data-grid-size={controls.gridSize}
      data-viewport-transform={controls.transform}
      className="relative min-h-0 w-full flex-1 touch-none overflow-hidden"
      onWheel={controls.onWheel}
      onPointerDown={controls.onPointerDown}
      onPointerMove={controls.onPointerMove}
      onPointerUp={controls.onPointerUp}
      style={{ ...controls.gridStyle, touchAction: "none" }}
    >
      <div className="absolute top-0 left-0 origin-top-left" style={controls.contentStyle}>
        <svg
          viewBox={layout.viewBox}
          className="pointer-events-none absolute top-0 left-0"
          style={{ width: layout.width, height: layout.height }}
          aria-hidden
          role="presentation"
        >
          {layout.edges.map((edge, i) => {
            const active =
              selectedNode !== null &&
              (edge.from.node.path === selectedNode.path || edge.to.node.path === selectedNode.path)
            return (
              <line
                key={`edge-${i.toString()}`}
                x1={edge.from.cx}
                y1={edge.from.cy}
                x2={edge.to.cx}
                y2={edge.to.cy}
                stroke={active ? "#0071E3" : "#D2D2D7"}
                strokeWidth={active ? 2 : 1.5}
                style={{
                  transition:
                    "stroke 150ms var(--ease-standard), stroke-width 150ms var(--ease-standard)",
                }}
              />
            )
          })}
        </svg>
        {layout.nodes.map((entry) => (
          <SpecNode
            key={entry.node.path}
            dir={entry.node.dir}
            name={fileNameOf(entry.node.path)}
            title={entry.node.title}
            dark={isSkeleton(entry.node)}
            selected={selectedNode?.path === entry.node.path}
            width={entry.width}
            x={entry.x}
            y={entry.y}
            onClick={() => onSelectNode(entry.node.path)}
          />
        ))}
      </div>
      <ZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        className="bottom-[72px] left-6"
      />
      <GraphLegend />
      {selectedNode && <DetailPanel node={selectedNode} edges={edges} onOpenDoc={onOpenDoc} />}
    </div>
  )
}

function GraphLegend() {
  return (
    <div className="absolute bottom-6 left-6 flex items-center gap-4">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-dark-card" />
        <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
          Core skeleton
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] border border-separator bg-surface" />
        <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
          LLM-generated
        </span>
      </span>
    </div>
  )
}
