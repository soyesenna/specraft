import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { Minus } from "lucide-react"
import { useMemo } from "react"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { DetailPanel, ZoomControls } from "./SpecsGraphDetailPanel.js"
import { buildLayout, fileNameOf } from "./specsGraphModel.js"
import { type GraphViewport, graphZoomPercent, type ViewportUpdater } from "./specsGraphViewport.js"
import { useGraphViewport } from "./useGraphViewport.js"

type DesktopDotCanvasProps = {
  readonly nodes: readonly WikiGraphNode[]
  readonly edges: WikiGraphResponse["edges"]
  readonly selectedNode: WikiGraphNode | null
  readonly viewport: GraphViewport
  readonly onViewportChange: ViewportUpdater
  readonly onSelectNode: (path: string) => void
  readonly onOpenDoc: (path: string) => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onFit: () => void
}

export function DesktopDotCanvas({
  nodes,
  edges,
  selectedNode,
  viewport,
  onViewportChange,
  onSelectNode,
  onOpenDoc,
  onZoomIn,
  onZoomOut,
  onFit,
}: DesktopDotCanvasProps) {
  const collapsed = useSidebarCollapsed()
  const controls = useGraphViewport(viewport, onViewportChange)
  const layout = useMemo(() => buildLayout(nodes, edges, collapsed), [nodes, edges, collapsed])
  // 비선택 dot은 단일 accent 규칙(DESIGN.md §7/§12-6)을 지키기 위해 토큰화된 중립 ink로 통일한다.
  // 선택 dot만 accent(#0071E3)를 사용해 chromatic budget을 단일 accent에 집중.
  const dotColor = "#1D1D1F"
  // 허브는 separator 토큰 회색으로 — 새 chromatic 색 도입 금지.
  const hubColor = "#D2D2D7"
  const zoomPercent = graphZoomPercent(viewport.scale)

  return (
    <div
      data-testid="specs-dot-canvas"
      data-grid-size={controls.gridSize}
      data-viewport-scale={viewport.scale}
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
                key={`dotedge-${i.toString()}`}
                x1={edge.from.cx}
                y1={edge.from.cy}
                x2={edge.to.cx}
                y2={edge.to.cy}
                stroke={active ? "#0071E3" : "#0000000F"}
                strokeWidth={active ? 1.5 : 1}
              />
            )
          })}
        </svg>
        {layout.clusters.map((cluster) => (
          <span
            key={`hub-${cluster.dir}`}
            aria-hidden
            className="absolute rounded-[2.5px]"
            style={{
              left: cluster.cx - 6,
              top: cluster.cy - 6,
              width: 12,
              height: 12,
              background: hubColor,
            }}
          />
        ))}
        {layout.nodes.map((entry) => {
          const selected = selectedNode?.path === entry.node.path
          const size = 11
          const color = selected ? "#0071E3" : dotColor
          return (
            <button
              key={`dot-${entry.node.path}`}
              type="button"
              aria-label={`${fileNameOf(entry.node.path)} details`}
              onClick={() => onSelectNode(entry.node.path)}
              className="absolute rounded-full bg-transparent p-0 focus-visible:outline-offset-4"
              style={{
                left: entry.cx - size / 2,
                top: entry.cy - size / 2,
                width: size,
                height: size,
                border: `${(size * 0.3).toFixed(2)}px solid ${color}`,
                boxShadow: `0 0 3px ${color}8C, 0 0 9px ${color}40, inset 0 0 3px ${color}66`,
              }}
            />
          )
        })}
      </div>
      <div className="absolute top-4 left-6 flex items-center gap-1.5 rounded-pill bg-surface px-3 py-[5px] shadow-[0_1px_6px_#00000014]">
        <Minus className="size-3 text-ink-secondary" />
        <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-secondary">
          Compact view — zoom {zoomPercent}
        </span>
      </div>
      <ZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        className="bottom-[86px] left-6"
      />
      <DotLegend />
      {selectedNode && <DetailPanel node={selectedNode} edges={edges} onOpenDoc={onOpenDoc} />}
    </div>
  )
}

function DotLegend() {
  return (
    <div className="absolute bottom-7 left-[72px] flex items-center gap-4">
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full border-[2.6px] border-ink" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Document</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-[2px] bg-separator" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Hub</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full border-[2.7px] border-accent" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Selected</span>
      </span>
    </div>
  )
}
