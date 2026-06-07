import type { WikiGraphNode, WikiGraphResponse } from "@specraft/shared"
import { Minus } from "lucide-react"
import { useMemo } from "react"
import { useSidebarCollapsed } from "../components/sidebarCollapsed.js"
import { DetailPanel, ZoomControls } from "./SpecsGraphDetailPanel.js"
import { buildLayout, fileNameOf, hashString } from "./specsGraphModel.js"
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
  /** 상세 패널 표시 여부 — X 닫기 후 노드 재클릭 전까지 false */
  readonly detailOpen: boolean
  readonly onCloseDetail: () => void
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
  detailOpen,
  onCloseDetail,
}: DesktopDotCanvasProps) {
  const collapsed = useSidebarCollapsed()
  const controls = useGraphViewport(viewport, onViewportChange)
  const layout = useMemo(() => buildLayout(nodes, edges, collapsed), [nodes, edges, collapsed])
  // 코스모스 dot 팔레트 — specraft-ui.pen 03c 화면 정본(파랑 계열 3색 + 글로우)과 1:1 정합.
  const dotColors = ["#7E92CE", "#5F76B8", "#9AACE4"] as const
  const zoomPercent = graphZoomPercent(viewport.scale)

  return (
    <div
      data-testid="specs-dot-canvas"
      data-grid-size={controls.gridSize}
      data-viewport-scale={viewport.scale}
      data-viewport-transform={controls.transform}
      className="relative min-h-0 w-full flex-1 touch-none overflow-hidden"
      ref={controls.canvasRef}
      onPointerDown={controls.onPointerDown}
      onPointerMove={controls.onPointerMove}
      onPointerUp={controls.onPointerUp}
      onPointerCancel={controls.onPointerCancel}
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
            className="absolute rounded-[2.5px] bg-[#59616F]"
            style={{ left: cluster.cx - 6, top: cluster.cy - 6, width: 12, height: 12 }}
          />
        ))}
        {layout.nodes.map((entry) => {
          const selected = selectedNode?.path === entry.node.path
          const size = 11
          const color = selected
            ? "#0071E3"
            : (dotColors[hashString(entry.node.path) % dotColors.length] ?? "#7E92CE")
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
      {/* 줌 배지 — 디자인 정본(M03c) 의도대로 상단 중앙, 뷰포트 폭과 무관하게 중앙 유지. */}
      <div className="-translate-x-1/2 absolute top-4 left-1/2 flex items-center gap-1.5 rounded-pill bg-surface px-3 py-[5px] shadow-[0_1px_6px_#00000014]">
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
      {selectedNode && detailOpen && (
        <DetailPanel
          node={selectedNode}
          edges={edges}
          onOpenDoc={onOpenDoc}
          onClose={onCloseDetail}
        />
      )}
    </div>
  )
}

function DotLegend() {
  return (
    <div className="absolute bottom-7 left-[72px] flex items-center gap-4">
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full border-[2.6px] border-[#5F76B8]" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Document</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-[2px] bg-[#59616F]" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Hub</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[9px] rounded-full border-[2.7px] border-accent" />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">Selected</span>
      </span>
    </div>
  )
}
