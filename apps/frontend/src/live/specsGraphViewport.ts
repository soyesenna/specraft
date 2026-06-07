import type { CSSProperties } from "react"

export type GraphViewport = {
  readonly x: number
  readonly y: number
  readonly scale: number
}

export type ViewportUpdater = (updater: (current: GraphViewport) => GraphViewport) => void

export const DEFAULT_GRAPH_VIEWPORT: GraphViewport = { x: 0, y: 0, scale: 1 }
export const GRAPH_COMPACT_THRESHOLD = 0.5
export const GRAPH_ZOOM_STEP = 0.1

const MIN_SCALE = 0.24
const MAX_SCALE = 2.4
const BASE_GRID_SIZE = 44

export function clampGraphScale(scale: number): number {
  return Math.min(Math.max(roundGraphValue(scale), MIN_SCALE), MAX_SCALE)
}

export function roundGraphValue(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function formatGraphViewport(viewport: GraphViewport): string {
  return `x=${roundGraphValue(viewport.x)};y=${roundGraphValue(viewport.y)};scale=${roundGraphValue(viewport.scale)}`
}

export function graphGridSize(scale: number): number {
  return roundGraphValue(Math.max(8, BASE_GRID_SIZE * clampGraphScale(scale)))
}

export function graphGridStyle(viewport: GraphViewport): CSSProperties {
  const size = graphGridSize(viewport.scale)
  return {
    backgroundColor: "#F5F5F7",
    backgroundImage:
      "linear-gradient(to right, #00000014 1px, transparent 1px), linear-gradient(to bottom, #00000014 1px, transparent 1px)",
    backgroundPosition: `${roundGraphValue(viewport.x)}px ${roundGraphValue(viewport.y)}px`,
    backgroundSize: `${size}px ${size}px`,
  }
}

export function graphZoomPercent(scale: number): string {
  return `${Math.round(clampGraphScale(scale) * 100)}%`
}

export function zoomGraphViewport(
  current: GraphViewport,
  nextScale: number,
  originX: number,
  originY: number,
): GraphViewport {
  const scale = clampGraphScale(nextScale)
  const ratio = scale / current.scale
  return {
    x: roundGraphValue(originX - (originX - current.x) * ratio),
    y: roundGraphValue(originY - (originY - current.y) * ratio),
    scale,
  }
}

export function stepGraphViewport(current: GraphViewport, delta: number): GraphViewport {
  return zoomGraphViewport(current, current.scale + delta, 0, 0)
}
