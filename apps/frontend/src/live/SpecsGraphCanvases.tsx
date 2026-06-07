import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { type PointerEvent, useMemo, useRef, type WheelEvent } from "react"
import { SpecNode } from "../components/SpecNode.js"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { DetailPanel, ZoomControls } from "./SpecsGraphDetailPanel.js"
import { buildLayout, fileNameOf, isSkeleton } from "./specsGraphModel.js"
import {
  formatGraphViewport,
  type GraphViewport,
  graphGridSize,
  graphGridStyle,
  type ViewportUpdater,
  zoomGraphViewport,
} from "./specsGraphViewport.js"

type DragState = {
  readonly startX: number
  readonly startY: number
  readonly originX: number
  readonly originY: number
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("button,a") !== null
}

function useGraphViewport(viewport: GraphViewport, onViewportChange: ViewportUpdater) {
  const drag = useRef<DragState | null>(null)

  function zoomBy(factor: number, originX = 0, originY = 0): void {
    onViewportChange((current) =>
      zoomGraphViewport(current, current.scale * factor, originX, originY),
    )
  }

  function onWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    zoomBy(event.deltaY < 0 ? 1.12 : 0.88, event.clientX - rect.left, event.clientY - rect.top)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (isInteractiveTarget(event.target)) {
      return
    }
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const activeDrag = drag.current
    if (activeDrag === null || event.buttons === 0) {
      return
    }
    onViewportChange((current) => {
      return {
        x: activeDrag.originX + event.clientX - activeDrag.startX,
        y: activeDrag.originY + event.clientY - activeDrag.startY,
        scale: current.scale,
      }
    })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.current = null
  }

  return {
    viewport,
    gridSize: graphGridSize(viewport.scale),
    gridStyle: graphGridStyle(viewport),
    transform: formatGraphViewport(viewport),
    style: {
      transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
    },
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}

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
      <div className="absolute top-0 left-0 origin-top-left" style={controls.style}>
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
