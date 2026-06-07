import { LogOut, SlidersHorizontal } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { BranchChip } from "../components/BranchChip.js"
import { BranchMenu } from "../components/BranchMenu.js"
import { Sidebar, type SidebarSection } from "../components/Sidebar.js"
import { SidebarCollapsedContext } from "../components/sidebarCollapsed.js"
import { TopNav } from "../components/TopNav.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { useBranch } from "./branch.js"

let sidebarCollapsed = false

function activeSidebarSection(pathname: string): SidebarSection | null {
  if (pathname.startsWith("/query")) {
    return "query"
  }
  if (pathname.startsWith("/activity")) {
    return "activity"
  }
  if (pathname.startsWith("/conflicts")) {
    return "conflicts"
  }
  if (pathname.startsWith("/specs")) {
    return "specs"
  }
  return null
}

function memberInitials(name: string | undefined, email: string | undefined): string {
  const source = name ?? email ?? "SP"
  return source.slice(0, 2).toUpperCase()
}

export function LiveShell({
  title,
  showSidebar = true,
  titleMeta,
  titlePrefix,
  titleRight,
  children,
}: {
  readonly title: string
  readonly showSidebar?: boolean
  readonly titleMeta?: ReactNode
  readonly titlePrefix?: ReactNode
  /** 타이틀 행 우측 끝 요소 (예: View full log 링크, 툴바 컨트롤) */
  readonly titleRight?: ReactNode
  readonly children: ReactNode
}) {
  const { logout, member, sessionChecked } = useSpecraft()
  const { branches, selectedBranch, setBranch, openConflictCount } = useBranch()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const branchAnchorRef = useRef<HTMLDivElement | null>(null)
  const profileMenuRef = useRef<HTMLElement | null>(null)
  const profileAnchorRef = useRef<HTMLElement | null>(null)
  // 드롭다운 ease-enter 페이드·슬라이드: mount 직후 다음 프레임에 entered=true로 전환한다.
  const [branchMenuEntered, setBranchMenuEntered] = useState(false)
  const [profileMenuEntered, setProfileMenuEntered] = useState(false)
  const [collapsed, setCollapsed] = useState(
    params.get("sidebar") === "collapsed" ? true : sidebarCollapsed,
  )

  useEffect(() => {
    if (sessionChecked && !member) {
      navigate("/signin", { replace: true })
    }
  }, [member, navigate, sessionChecked])

  // 브랜치 드롭다운: 외부 포인터 클릭 닫기 + Escape 닫기 후 BranchChip으로 포커스 복귀.
  useEffect(() => {
    if (!branchMenuOpen) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      if (branchAnchorRef.current && !branchAnchorRef.current.contains(event.target as Node)) {
        setBranchMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBranchMenuOpen(false)
        branchAnchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [branchMenuOpen])

  // 프로필 메뉴: 외부 포인터 클릭 닫기 + Escape 닫기 후 아바타 버튼으로 포커스 복귀.
  // 아바타 버튼은 TopNav 내부(같은 header)에 있어 aria-label로 조회한다.
  useEffect(() => {
    if (!profileMenuOpen) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (profileMenuRef.current?.contains(target)) {
        return
      }
      // 아바타 버튼 클릭은 토글 핸들러가 처리하므로 외부 닫기에서 제외.
      if (profileAnchorRef.current?.contains(target)) {
        return
      }
      setProfileMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false)
        profileAnchorRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [profileMenuOpen])

  // 프로필 메뉴 열림 시 첫 항목으로 포커스 이동, 닫힐 때 아바타 앵커를 캐시.
  useEffect(() => {
    if (profileMenuOpen) {
      profileAnchorRef.current = document.querySelector<HTMLButtonElement>(
        'button[aria-label="프로필 메뉴 열기"]',
      )
      profileMenuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus()
    }
  }, [profileMenuOpen])

  // ease-enter 전환 구동: 닫힐 때 즉시 초기 상태로, 열리면 다음 프레임에 entered.
  useEffect(() => {
    if (!branchMenuOpen) {
      setBranchMenuEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setBranchMenuEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [branchMenuOpen])

  useEffect(() => {
    if (!profileMenuOpen) {
      setProfileMenuEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setProfileMenuEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [profileMenuOpen])

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current
      sidebarCollapsed = next
      return next
    })
  }
  const sidebarActive = activeSidebarSection(location.pathname)
  const initials = memberInitials(member?.name, member?.email)
  const branchChip = (
    <div ref={branchAnchorRef} className="relative">
      <BranchChip
        branch={selectedBranch}
        open={branchMenuOpen}
        onClick={() => setBranchMenuOpen((open) => !open)}
        aria-expanded={branchMenuOpen}
        aria-haspopup="true"
      />
      {branchMenuOpen && branches.length > 0 && (
        <div
          className={cn(
            "absolute top-[42px] left-0 z-40 origin-top transition duration-150 ease-[cubic-bezier(0.2,0.6,0.25,1)] motion-reduce:transition-none",
            branchMenuEntered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <BranchMenu
            rows={branches}
            onSelect={(branch) => {
              setBranch(branch)
              setBranchMenuOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
  const headingMeta = titleMeta === undefined ? branchChip : titleMeta

  async function signOut(): Promise<void> {
    await logout()
    setProfileMenuOpen(false)
    navigate("/signin")
  }

  return (
    <SidebarCollapsedContext.Provider value={collapsed}>
      <div className="flex h-full min-h-[640px] flex-col overflow-hidden bg-bg text-ink">
        <TopNav
          avatarExpanded={profileMenuOpen}
          brandHref="/specs"
          initials={initials}
          onAvatarClick={() => setProfileMenuOpen((open) => !open)}
        >
          {profileMenuOpen && (
            <nav
              ref={profileMenuRef}
              aria-label="프로필 메뉴"
              className={cn(
                "absolute top-[54px] right-[28px] z-50 flex w-[236px] flex-col gap-0.5 rounded-md bg-surface p-1.5 shadow-[3px_5px_30px_#00000038] origin-top-right transition duration-150 ease-[cubic-bezier(0.2,0.6,0.25,1)] motion-reduce:transition-none",
                profileMenuEntered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
              )}
            >
              <div className="flex w-full flex-col gap-0.5 px-2.5 py-2">
                <span className="pen-text text-[13px] font-semibold tracking-[-0.2px] text-ink">
                  {member?.name ?? "Specraft user"}
                </span>
                <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                  {member?.email ?? "session pending"}
                </span>
              </div>
              <div className="h-px w-full bg-hairline" />
              <Link
                to="/settings/git"
                onClick={() => setProfileMenuOpen(false)}
                className="flex h-8 w-full items-center gap-[9px] rounded-[7px] bg-bg px-2.5 transition-[filter] duration-150 ease-[var(--ease-standard)] hover:brightness-95"
              >
                <SlidersHorizontal className="size-3.5 text-ink-secondary" />
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Settings</span>
              </Link>
              <div className="h-px w-full bg-hairline" />
              <button
                type="button"
                onClick={() => {
                  void signOut()
                }}
                className="flex h-8 w-full items-center gap-[9px] rounded-[7px] px-2.5 transition-colors duration-150 ease-[var(--ease-standard)] hover:bg-hairline"
              >
                <LogOut className="size-3.5 text-ink-secondary" />
                <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Sign out</span>
              </button>
            </nav>
          )}
        </TopNav>
        <div className="flex min-h-0 flex-1">
          {showSidebar && (
            <Sidebar
              active={sidebarActive}
              collapsed={collapsed}
              conflictCount={openConflictCount}
              onToggle={toggleSidebar}
            />
          )}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-[64px] shrink-0 items-center gap-3.5 px-7">
              {titlePrefix}
              <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px]">
                {title}
              </h1>
              {headingMeta}
              {titleRight && (
                <>
                  <div className="h-px flex-1" />
                  {titleRight}
                </>
              )}
            </div>
            {sessionChecked ? children : <div aria-hidden className="min-h-0 flex-1 bg-bg" />}
          </main>
        </div>
      </div>
    </SidebarCollapsedContext.Provider>
  )
}
