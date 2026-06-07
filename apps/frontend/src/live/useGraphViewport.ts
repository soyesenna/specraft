import { type CSSProperties, type PointerEvent, useRef, useState, type WheelEvent } from "react"
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

export function useGraphViewport(viewport: GraphViewport, onViewportChange: ViewportUpdater) {
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)

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
    setDragging(true)
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
    setDragging(false)
  }

  const gridStyle: CSSProperties = {
    ...graphGridStyle(viewport),
    cursor: dragging ? "grabbing" : "grab",
  }
  const contentStyle: CSSProperties = {
    transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
  }

  return {
    gridSize: graphGridSize(viewport.scale),
    gridStyle,
    transform: formatGraphViewport(viewport),
    contentStyle,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
