import { createContext, useContext } from "react"

/** 사이드바 접힘 여부 컨텍스트 — AppShell/LiveShell 양쪽이 제공 (03/03b 그래프 좌표 스위칭용) */
export const SidebarCollapsedContext = createContext(false)

/** 셸 하위에서 사이드바 접힘 여부 구독 */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapsedContext)
}
