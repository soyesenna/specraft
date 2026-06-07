import { FileText, X } from "lucide-react"
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { Link, useNavigate } from "react-router-dom"
import { cn } from "../lib/cn.js"
import { Avatar } from "./Avatar.js"

type DocSheetProps = {
  dir?: string
  name?: string
  summary?: string
  meta?: string
  commit?: string
  connected?: string[]
  moreCount?: number
  /** Open document 링크 목적지(/specs/doc/:docId) — 미지정 시 name 에서 파생 */
  docId?: string
  onClose?: () => void
  className?: string
}

/** 바텀시트 슬라이드 모션 길이 — DESIGN.md §15 motion-standard(300ms). */
const SHEET_MOTION_MS = 300
/** 그래버를 이 거리(px) 이상 위로 끌어올리면 문서 상세로 이동한다. */
const SWIPE_UP_OPEN_THRESHOLD = 64
/** 드래그 추종 감쇠 — 시트가 손가락의 절반만 따라와 러버밴드 느낌을 준다. */
const SWIPE_DAMPING = 0.5

/**
 * component/Doc Sheet — 모바일 디태치드 플로팅 바텀시트 (r22, 0 10px 30px 섀도).
 * 폭은 부모 래퍼가 결정한다(w-full) — 390px 디자인 기준 inset-x-2.5(370px).
 * 그래버 / 헤드(닫기) / 요약 / 메타 / CONNECTED 칩 / Open document 버튼.
 *
 * 등장/퇴장 모션: 부모가 조건부 마운트하므로 시트 내부에서 자체 진입(미묘한 상승+페이드)을
 * 재생하고, 닫을 때는 하강 퇴장을 끝낸 뒤 지연 언마운트(onClose 콜백)로 넘긴다.
 * 디태치드 플로팅 시트라 스크림 없이 떠 있고, motion-reduce 환경은 즉시 전환·즉시 언마운트한다.
 */
export function DocSheet({
  dir = "SPECS",
  name = "stop-gate.md",
  summary = "세션 종료를 차단하는 Stop 게이트의 3중 검사(clean · pushed · ingested)와 read-only 면제(D9) 규칙.",
  meta = "soyesenna · 2시간 전",
  commit = "a1b2c3d",
  connected = ["overview.md", "mcp-proxy.md"],
  moreCount = 2,
  docId,
  onClose,
  className,
}: DocSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const docPath = `/specs/doc/${docId ?? name.replace(/\.md$/, "")}`

  // 그래버 스와이프-업: 위로 끌어올리면 문서 상세로 이동 (iOS 시트 확장 관습).
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState<number | null>(null)

  function onGrabberPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    dragStartY.current = event.clientY
    setDragOffset(0)
  }

  function onGrabberPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragStartY.current === null) {
      return
    }
    // 위 방향만 허용 + 감쇠 — 아래로는 끌리지 않는다.
    setDragOffset(Math.min(0, event.clientY - dragStartY.current) * SWIPE_DAMPING)
  }

  function onGrabberPointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragStartY.current === null) {
      return
    }
    const rawDelta = event.clientY - dragStartY.current
    dragStartY.current = null
    setDragOffset(null)
    if (rawDelta <= -SWIPE_UP_OPEN_THRESHOLD) {
      navigate(docPath)
    }
  }

  function onGrabberPointerCancel(): void {
    dragStartY.current = null
    setDragOffset(null)
  }

  // entered: 진입 트랜지션 트리거(마운트 다음 프레임에 on). closing: 퇴장 트랜지션 트리거.
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)

  // 마운트 다음 프레임에 진입 상태로 전환 — translate-y-3/opacity-0 → translate-y-0/opacity-100.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // 진행 중 타이머 정리(언마운트 누수 방지).
  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  // 퇴장 모션 재생 후 지연 언마운트. motion-reduce면 즉시 onClose.
  const requestClose = useCallback(() => {
    if (closing) {
      return
    }
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    if (reduceMotion) {
      onClose?.()
      return
    }
    setClosing(true)
    closeTimerRef.current = setTimeout(() => {
      onClose?.()
    }, SHEET_MOTION_MS)
  }, [closing, onClose])

  // 모달성 바텀시트 접근성: Escape 닫기, 초기 포커스 이동, 포커스 트랩, 트리거 복귀.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null

    // 마운트 시 닫기 버튼으로 초기 포커스 이동 — 시트 내부로 키보드 진입점 확보.
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        requestClose()
        return
      }
      if (event.key !== "Tab") return

      // 포커스 트랩 — 시트 내부 포커스 가능 요소 사이로만 Tab 순환.
      const root = sheetRef.current
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      // 언마운트 시 시트를 연 트리거(MobileNode 버튼)로 포커스 복귀.
      trigger?.focus?.()
    }
  }, [requestClose])

  // 진입 완료 + 퇴장 시작 전 = 화면에 떠 있는 상태. 진입 전/퇴장 중에는 아래로 슬라이드·페이드 아웃.
  const visible = entered && !closing

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${dir} ${name}`}
      className={cn(
        "flex w-full flex-col gap-[11px] rounded-[22px] bg-surface px-[18px] pt-2 pb-4 shadow-[0_10px_30px_#00000030] transition-[transform,opacity] duration-300 motion-reduce:transition-none",
        closing ? "ease-[var(--ease-exit)]" : "ease-[var(--ease-enter)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
      // 드래그 중에는 인라인 transform이 클래스 트랜지션을 덮어 손가락을 즉시 추종한다.
      style={
        dragOffset !== null
          ? { transform: `translateY(${dragOffset}px)`, transitionProperty: "none" }
          : undefined
      }
    >
      {/* 그래버 — 위로 끌어올리면 문서 상세로 이동. 히트 영역은 시각 변화 없이 상하로 확장. */}
      <div
        role="presentation"
        data-testid="doc-sheet-grabber"
        onPointerDown={onGrabberPointerDown}
        onPointerMove={onGrabberPointerMove}
        onPointerUp={onGrabberPointerUp}
        onPointerCancel={onGrabberPointerCancel}
        className="-my-2 flex w-full cursor-grab touch-none select-none justify-center py-2 active:cursor-grabbing"
      >
        <span className="h-[4.5px] w-9 rounded-[2.5px] bg-separator" />
      </div>
      <div className="flex w-full items-center gap-2.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
            {dir}
          </span>
          <span className="pen-text font-text text-[18px] font-semibold tracking-[-0.28px] text-ink">
            {name}
          </span>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={requestClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-bg"
          aria-label="닫기"
        >
          <X className="size-[13px] text-ink-tertiary" />
        </button>
      </div>
      <p className="pen-text m-0 w-full text-[12.5px] leading-[1.55] tracking-[-0.12px] text-ink-secondary">
        {summary}
      </p>
      <div className="flex w-full items-center gap-[7px]">
        <Avatar initials="SY" size={18} />
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">{meta}</span>
        <span className="flex items-center rounded-[4px] bg-bg px-1.5 py-0.5">
          <span className="pen-text font-mono text-[9.5px] text-ink-secondary">{commit}</span>
        </span>
      </div>
      <div className="flex w-full items-center gap-1.5">
        <span className="pen-text text-[9.5px] font-semibold tracking-[0.8px] text-ink-tertiary">
          CONNECTED
        </span>
        {connected.map((doc) => (
          <span key={doc} className="flex items-center gap-1 rounded-[6px] bg-bg px-2 py-[3px]">
            <FileText className="size-2.5 text-ink-tertiary" />
            <span className="pen-text text-[10.5px] tracking-[-0.1px] text-link">{doc}</span>
          </span>
        ))}
        {moreCount > 0 && (
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            +{moreCount}
          </span>
        )}
      </div>
      <Link
        to={docPath}
        className="flex h-[46px] w-full items-center justify-center rounded-xl bg-accent"
      >
        <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
          Open document
        </span>
      </Link>
    </div>
  )
}
