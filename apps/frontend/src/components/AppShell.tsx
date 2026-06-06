import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Sidebar, type SidebarSection } from "./Sidebar.js"
import { TopNav } from "./TopNav.js"

// 사이드바 접힘 상태 — 라우트 전환 간 유지 (03b/04b 변형)
let sidebarCollapsed = false

const SidebarCollapsedContext = createContext(false)

/** AppShell 하위에서 사이드바 접힘 여부 구독 (03/03b 그래프 좌표 스위칭용) */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapsedContext)
}

type AppShellProps = {
  active: SidebarSection
  /** TopNav 아바타 클릭 핸들러 (Profile Menu) */
  onAvatarClick?: (() => void) | undefined
  /** TopNav 기준 절대배치 오버레이 (Profile Menu 등) */
  topNavOverlay?: ReactNode
  children: ReactNode
}

/** 데스크톱 공통 셸 — TopNav + Sidebar + Main (01/02/Settings 제외 전 화면) */
export function AppShell({ active, onAvatarClick, topNavOverlay, children }: AppShellProps) {
  const [params] = useSearchParams()
  const [collapsed, setCollapsed] = useState(
    // ?sidebar=collapsed 딥링크 — 03b/04b 변형 직접 진입
    params.get("sidebar") === "collapsed" ? true : sidebarCollapsed,
  )
  const toggle = () => {
    sidebarCollapsed = !sidebarCollapsed
    setCollapsed(sidebarCollapsed)
  }
  return (
    <SidebarCollapsedContext.Provider value={collapsed}>
      <div className="flex h-full min-h-[600px] flex-col overflow-hidden bg-bg">
        <TopNav onAvatarClick={onAvatarClick}>{topNavOverlay}</TopNav>
        <div className="flex min-h-0 w-full flex-1">
          <Sidebar active={active} collapsed={collapsed} onToggle={toggle} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
    </SidebarCollapsedContext.Provider>
  )
}
