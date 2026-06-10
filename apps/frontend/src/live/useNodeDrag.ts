import { type PointerEvent, useRef } from "react"
import type { GraphNodePosition } from "./specsGraphModel.js"

/** 이 거리(픽셀) 미만의 포인터 이동은 클릭으로 취급한다 — 드래그 시작 지터 방지. */
const DRAG_THRESHOLD_PX = 4

type DragState = {
  pointerId: number
  path: string
  /** 드래그 시작 시점의 노드 콘텐츠 좌표 (좌상단) */
  originX: number
  originY: number
  startClientX: number
  startClientY: number
  moved: boolean
}

export type NodeDragControls = {
  /** 노드 버튼 onPointerDown — 현재 레이아웃 좌표와 함께 드래그를 시작한다. */
  readonly start: (
    path: string,
    origin: GraphNodePosition,
    event: PointerEvent<HTMLElement>,
  ) => void
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void
  /** 직전 포인터 시퀀스가 드래그였으면 true — 노드 onClick에서 선택 동작을 막는다. */
  readonly wasDragged: () => boolean
}

/*
 * 그래프 노드 드래그. 캔버스 패닝(useGraphViewport)은 button을 인터랙티브 타깃으로
 * 보고 건너뛰므로, 노드 위 포인터 제스처는 온전히 이 훅이 소유한다.
 * 화면 픽셀 이동량을 viewport.scale로 나눠 콘텐츠 좌표 이동량으로 환산한다.
 */
export function useNodeDrag(input: {
  readonly scale: number
  readonly onMove: (path: string, position: GraphNodePosition) => void
  /** 드래그 확정(임계값 초과 이동) 후 포인터를 놓는 순간 — 저장 트리거 */
  readonly onMoveEnd: () => void
}): NodeDragControls {
  const drag = useRef<DragState | null>(null)
  const dragged = useRef(false)
  // 드래그 도중 줌이 바뀌어도 최신 배율로 환산하도록 ref로 고정한다.
  const scaleRef = useRef(input.scale)
  scaleRef.current = input.scale
  const callbacksRef = useRef({ onMove: input.onMove, onMoveEnd: input.onMoveEnd })
  callbacksRef.current = { onMove: input.onMove, onMoveEnd: input.onMoveEnd }

  function start(path: string, origin: GraphNodePosition, event: PointerEvent<HTMLElement>): void {
    dragged.current = false
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    drag.current = {
      pointerId: event.pointerId,
      path,
      originX: origin.x,
      originY: origin.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>): void {
    const active = drag.current
    if (active === null || active.pointerId !== event.pointerId || event.buttons === 0) {
      return
    }
    const dx = event.clientX - active.startClientX
    const dy = event.clientY - active.startClientY
    if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
      return
    }
    active.moved = true
    const scale = Math.max(scaleRef.current, 0.01)
    callbacksRef.current.onMove(active.path, {
      x: active.originX + dx / scale,
      y: active.originY + dy / scale,
    })
  }

  function onPointerUp(event: PointerEvent<HTMLElement>): void {
    const active = drag.current
    if (active === null || active.pointerId !== event.pointerId) {
      return
    }
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.current = null
    dragged.current = active.moved
    if (active.moved) {
      callbacksRef.current.onMoveEnd()
    }
  }

  return {
    start,
    onPointerMove,
    onPointerUp,
    wasDragged: () => dragged.current,
  }
}
