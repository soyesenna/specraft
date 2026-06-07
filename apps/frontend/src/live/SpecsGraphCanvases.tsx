import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { type PointerEvent, useMemo, useRef, useState, type WheelEvent } from "react"
import { SpecNode } from "../components/SpecNode.js"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { DetailPanel, ZoomControls } from "./SpecsGraphDetailPanel.js"
import { buildLayout, fileNameOf, isSkeleton } from "./specsGraphModel.js"

type Viewport = {
  readonly x: number
  readonly y: number
  readonly scale: number
}

type DragState = {
  readonly startX: number
  readonly startY: number
  readonly originX: number
  readonly originY: number
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 }
const MIN_SCALE = 0.24
const MAX_SCALE = 2.4

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function formatViewport(viewport: Viewport): string {
  return `x=${round(viewport.x)};y=${round(viewport.y)};scale=${round(viewport.scale)}`
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("button,a") !== null
}

function useGraphViewport() {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const drag = useRef<DragState | null>(null)

  function zoomBy(factor: number, originX = 0, originY = 0): void {
    setViewport((current) => {
      const nextScale = clampScale(current.scale * factor)
      const ratio = nextScale / current.scale
      return {
        x: originX - (originX - current.x) * ratio,
        y: originY - (originY - current.y) * ratio,
        scale: nextScale,
      }
    })
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
    setViewport({
      x: activeDrag.originX + event.clientX - activeDrag.startX,
      y: activeDrag.originY + event.clientY - activeDrag.startY,
      scale: viewport.scale,
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
    transform: formatViewport(viewport),
    style: {
      transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
    },
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    reset: () => setViewport(DEFAULT_VIEWPORT),
    zoomIn: () => zoomBy(1.14, 0, 0),
  }
}

type DesktopGraphCanvasProps = {
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly selectedNode: WikiGraphNode | null
  readonly onSelectNode: (path: string) => void
  readonly onOpenDoc: (path: string) => void
  readonly onZoomOut: () => void
}

export function DesktopGraphCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onOpenDoc,
  onZoomOut,
}: DesktopGraphCanvasProps) {
  const collapsed = useSidebarCollapsed()
  const viewport = useGraphViewport()
  const layout = useMemo(() => buildLayout(nodes, edges, collapsed), [nodes, edges, collapsed])

  return (
    <div
      data-testid="specs-graph-canvas"
      data-viewport-transform={viewport.transform}
      className="relative min-h-0 w-full flex-1 touch-none overflow-hidden"
      onWheel={viewport.onWheel}
      onPointerDown={viewport.onPointerDown}
      onPointerMove={viewport.onPointerMove}
      onPointerUp={viewport.onPointerUp}
      style={{ touchAction: "none" }}
    >
      <div className="absolute top-0 left-0 origin-top-left" style={viewport.style}>
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
        onZoomIn={viewport.zoomIn}
        onZoomOut={onZoomOut}
        onFit={viewport.reset}
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
