import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  formatGraphViewport,
  type GraphViewport,
  graphGridSize,
  graphGridStyle,
  type ViewportUpdater,
  zoomGraphViewport,
} from "./specsGraphViewport.js"

/*
 * Figma식 제스처 모델.
 * - 휠/두 손가락 스크롤: 패닝 (delta 1:1)
 * - 트랙패드 핀치(ctrlKey wheel)·cmd+휠: 커서 기준 줌 — delta 비례 지수 곡선
 * - 드래그: 1:1 패닝 + 놓는 속도에 비례한 플릭 관성(지수 마찰 감쇠)
 * - 두 포인터(터치): 핀치 줌 + 중점 이동 패닝
 */

/** 트랙패드 핀치(ctrlKey) 줌 감도 — delta가 작고 연속적이라 큰 계수를 쓴다. */
const PINCH_ZOOM_SENSITIVITY = 0.0075
/** cmd+휠 줌 감도 — 트랙패드 스크롤 delta가 크므로 낮게 잡는다. */
const WHEEL_ZOOM_SENSITIVITY = 0.0012
/** 이벤트 1회당 줌 배율 상한 — 고속 휠 노치로 한 번에 확 튀는 것 방지. */
const MAX_STEP_FACTOR = 1.25
const MIN_STEP_FACTOR = 0.8
/** deltaMode=1(LINE, Firefox 휠) 보정 픽셀. */
const LINE_DELTA_PX = 16

/** 플릭 속도 산출에 쓰는 최근 이동 샘플 윈도우. */
const VELOCITY_WINDOW_MS = 90
/** 샘플 구간이 이보다 짧으면 관성 없음 — 탭/합성 이벤트 보호. */
const MIN_FLICK_SPAN_MS = 20
/** px/ms — 이 속도 미만으로 놓으면 관성 없이 그 자리에 선다. */
const FLICK_MIN_SPEED = 0.3
/** px/ms — 관성 시작 속도 상한. */
const FLICK_MAX_SPEED = 2.8
/** ms당 지수 마찰 계수 — 클수록 빨리 멈춘다. */
const FRICTION = 0.0042
/** px/ms — 이 속도 아래로 떨어지면 관성 종료. */
const STOP_SPEED = 0.02

type DragState = {
  pointerId: number
  x: number
  y: number
}

type PinchState = {
  readonly dist: number
  readonly midX: number
  readonly midY: number
}

type VelocitySample = {
  readonly t: number
  readonly x: number
  readonly y: number
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("button,a") !== null
}

function clampFactor(factor: number): number {
  return Math.min(Math.max(factor, MIN_STEP_FACTOR), MAX_STEP_FACTOR)
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  )
}

export function useGraphViewport(viewport: GraphViewport, onViewportChange: ViewportUpdater) {
  const drag = useRef<DragState | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<PinchState | null>(null)
  const samples = useRef<VelocitySample[]>([])
  const inertiaFrame = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)

  // 관성 RAF 루프가 항상 최신 updater를 보도록 ref로 고정한다.
  const updateRef = useRef(onViewportChange)
  updateRef.current = onViewportChange

  function stopInertia(): void {
    if (inertiaFrame.current !== null) {
      cancelAnimationFrame(inertiaFrame.current)
      inertiaFrame.current = null
    }
  }

  // 언마운트 시 관성 루프 정리.
  useEffect(() => stopInertia, [])

  function pushSample(x: number, y: number): void {
    const now = performance.now()
    samples.current.push({ t: now, x, y })
    while (
      samples.current.length > 0 &&
      now - (samples.current[0]?.t ?? now) > VELOCITY_WINDOW_MS
    ) {
      samples.current.shift()
    }
  }

  /** 놓는 순간의 속도가 충분하면 지수 감쇠 관성 패닝을 시작한다. */
  function maybeStartInertia(): void {
    const trail = samples.current
    const first = trail[0]
    const last = trail[trail.length - 1]
    samples.current = []
    if (first === undefined || last === undefined || first === last) {
      return
    }
    const span = last.t - first.t
    if (span < MIN_FLICK_SPAN_MS || prefersReducedMotion()) {
      return
    }
    let vx = (last.x - first.x) / span
    let vy = (last.y - first.y) / span
    const speed = Math.hypot(vx, vy)
    if (speed < FLICK_MIN_SPEED) {
      return
    }
    if (speed > FLICK_MAX_SPEED) {
      vx *= FLICK_MAX_SPEED / speed
      vy *= FLICK_MAX_SPEED / speed
    }
    let prev = performance.now()
    const step = (now: number) => {
      // 백그라운드 탭 복귀 등으로 프레임 간격이 비정상적으로 길면 한 프레임 분만 적용.
      const dt = Math.min(now - prev, 64)
      prev = now
      const decay = Math.exp(-FRICTION * dt)
      vx *= decay
      vy *= decay
      updateRef.current((current) => ({
        x: current.x + vx * dt,
        y: current.y + vy * dt,
        scale: current.scale,
      }))
      inertiaFrame.current = Math.hypot(vx, vy) > STOP_SPEED ? requestAnimationFrame(step) : null
    }
    inertiaFrame.current = requestAnimationFrame(step)
  }

  function pinchOf(): PinchState | null {
    const pair = [...pointers.current.values()]
    const a = pair[0]
    const b = pair[1]
    if (a === undefined || b === undefined) {
      return null
    }
    return {
      dist: Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    }
  }

  /*
   * 휠은 네이티브 non-passive 리스너로 받는다 — React 17+는 wheel을 passive로
   * 위임하므로 React onWheel의 preventDefault()가 무시되어, 핀치(ctrl+휠) 시
   * 브라우저 페이지 줌·가로 스크롤 시 히스토리 스와이프가 함께 발생한다.
   */
  function handleWheel(event: globalThis.WheelEvent): void {
    const element = canvasEl.current
    if (element === null) {
      return
    }
    event.preventDefault()
    stopInertia()
    const unit = event.deltaMode === 1 ? LINE_DELTA_PX : 1
    const dx = event.deltaX * unit
    const dy = event.deltaY * unit
    if (event.ctrlKey || event.metaKey) {
      // 핀치(ctrlKey) 또는 cmd+휠 = 커서 기준 줌.
      const sensitivity = event.ctrlKey ? PINCH_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY
      const factor = clampFactor(Math.exp(-dy * sensitivity))
      const rect = element.getBoundingClientRect()
      const originX = event.clientX - rect.left
      const originY = event.clientY - rect.top
      updateRef.current((current) =>
        zoomGraphViewport(current, current.scale * factor, originX, originY),
      )
      return
    }
    // 수식키 없는 휠/두 손가락 스크롤 = 패닝.
    updateRef.current((current) => ({
      x: current.x - dx,
      y: current.y - dy,
      scale: current.scale,
    }))
  }

  const canvasEl = useRef<HTMLDivElement | null>(null)
  // 렌더마다 새로 만들어지는 handleWheel을 안정된 리스너 하나로 감싼다.
  const wheelHandlerRef = useRef(handleWheel)
  wheelHandlerRef.current = handleWheel
  const stableWheel = useRef((event: globalThis.WheelEvent) => {
    wheelHandlerRef.current(event)
  }).current

  /*
   * Safari 데스크톱 트랙패드 핀치 — Safari는 핀치를 ctrl+휠로 변환하지 않고
   * 비표준 GestureEvent(scale 누적값)로만 보낸다. 직전 scale 대비 비율로 줌하고
   * preventDefault로 페이지 줌을 막는다. (Chrome/Firefox는 이 이벤트를 안 쏜다.)
   */
  const gestureScale = useRef(1)
  const stableGesture = useRef((event: Event) => {
    event.preventDefault()
    const element = canvasEl.current
    if (element === null) {
      return
    }
    const gesture = event as Event & { scale?: number; clientX?: number; clientY?: number }
    if (event.type === "gesturestart") {
      gestureScale.current = 1
      return
    }
    if (event.type !== "gesturechange" || typeof gesture.scale !== "number") {
      return
    }
    const factor = clampFactor(gesture.scale / gestureScale.current)
    gestureScale.current = gesture.scale
    const rect = element.getBoundingClientRect()
    const originX = (gesture.clientX ?? rect.left + rect.width / 2) - rect.left
    const originY = (gesture.clientY ?? rect.top + rect.height / 2) - rect.top
    updateRef.current((current) =>
      zoomGraphViewport(current, current.scale * factor, originX, originY),
    )
  }).current

  const canvasRef = useCallback(
    (element: HTMLDivElement | null) => {
      const previous = canvasEl.current
      if (previous !== null) {
        previous.removeEventListener("wheel", stableWheel)
        previous.removeEventListener("gesturestart", stableGesture)
        previous.removeEventListener("gesturechange", stableGesture)
        previous.removeEventListener("gestureend", stableGesture)
      }
      canvasEl.current = element
      if (element !== null) {
        element.addEventListener("wheel", stableWheel, { passive: false })
        element.addEventListener("gesturestart", stableGesture)
        element.addEventListener("gesturechange", stableGesture)
        element.addEventListener("gestureend", stableGesture)
      }
    },
    [stableWheel, stableGesture],
  )

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    // 어떤 입력이든 진행 중인 관성 글라이드를 먼저 중단한다 (줌/핏 버튼 클릭 포함).
    stopInertia()
    if (isInteractiveTarget(event.target)) {
      return
    }
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      // 두 번째 손가락 — 드래그를 핀치로 승격.
      drag.current = null
      samples.current = []
      pinch.current = pinchOf()
    } else if (pointers.current.size === 1) {
      drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      samples.current = [{ t: performance.now(), x: event.clientX, y: event.clientY }]
    }
    setDragging(true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const tracked = pointers.current.get(event.pointerId)
    if (tracked !== undefined) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const activePinch = pinch.current
    if (activePinch !== null && pointers.current.size >= 2) {
      const next = pinchOf()
      if (next === null) {
        return
      }
      pinch.current = next
      const factor = clampFactor(next.dist / activePinch.dist)
      const panX = next.midX - activePinch.midX
      const panY = next.midY - activePinch.midY
      const rect = event.currentTarget.getBoundingClientRect()
      const originX = next.midX - rect.left
      const originY = next.midY - rect.top
      updateRef.current((current) => {
        const zoomed = zoomGraphViewport(current, current.scale * factor, originX, originY)
        return { x: zoomed.x + panX, y: zoomed.y + panY, scale: zoomed.scale }
      })
      return
    }
    const activeDrag = drag.current
    if (activeDrag === null || activeDrag.pointerId !== event.pointerId || event.buttons === 0) {
      return
    }
    const dx = event.clientX - activeDrag.x
    const dy = event.clientY - activeDrag.y
    activeDrag.x = event.clientX
    activeDrag.y = event.clientY
    pushSample(event.clientX, event.clientY)
    updateRef.current((current) => ({
      x: current.x + dx,
      y: current.y + dy,
      scale: current.scale,
    }))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    pointers.current.delete(event.pointerId)
    if (pinch.current !== null) {
      if (pointers.current.size >= 2) {
        pinch.current = pinchOf()
        return
      }
      // 핀치 종료 — 남은 손가락이 있으면 드래그로 강등.
      pinch.current = null
      const restEntry = [...pointers.current.entries()][0]
      if (restEntry !== undefined) {
        const [pointerId, position] = restEntry
        drag.current = { pointerId, x: position.x, y: position.y }
        samples.current = [{ t: performance.now(), x: position.x, y: position.y }]
        return
      }
      setDragging(false)
      return
    }
    if (drag.current?.pointerId === event.pointerId) {
      pushSample(event.clientX, event.clientY)
      maybeStartInertia()
      drag.current = null
    }
    if (pointers.current.size === 0) {
      setDragging(false)
    }
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
    /** non-passive wheel 리스너를 붙이는 캔버스 ref — JSX onWheel 대신 사용. */
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    /** pointercancel(제스처 중단·시스템 인터럽트)도 up과 동일하게 정리한다. */
    onPointerCancel: onPointerUp,
  }
}
