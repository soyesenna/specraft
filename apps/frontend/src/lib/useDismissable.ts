import { type RefObject, useEffect } from "react"

/**
 * 드롭다운/메뉴 공용 dismiss 패턴 — 외부 포인터 클릭으로 닫기 +
 * Escape 닫기 후 트리거(restoreFocusRef)로 포커스 복귀.
 * containerRef는 메뉴와 트리거를 함께 감싸는 앵커 요소를 가리켜야
 * 트리거 재클릭이 토글 핸들러와 충돌하지 않는다.
 */
export function useDismissable(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  restoreFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        restoreFocusRef?.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose, containerRef, restoreFocusRef])
}
