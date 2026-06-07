import { LogOut, SlidersHorizontal } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { BranchChip } from "../components/BranchChip.js"
import { BranchMenu } from "../components/BranchMenu.js"
import { SidebarCollapsedContext } from "../components/sidebarCollapsed.js"
import { Sidebar, type SidebarSection } from "../components/Sidebar.js"
import { TopNav } from "../components/TopNav.js"
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
  children,
}: {
  readonly title: string
  readonly showSidebar?: boolean
  readonly titleMeta?: ReactNode
  readonly titlePrefix?: ReactNode
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
  const [collapsed, setCollapsed] = useState(
    params.get("sidebar") === "collapsed" ? true : sidebarCollapsed,
  )

  useEffect(() => {
    if (sessionChecked && !member) {
      navigate("/signin", { replace: true })
    }
  }, [member, navigate, sessionChecked])

  useEffect(() => {
    if (!branchMenuOpen) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      if (branchAnchorRef.current && !branchAnchorRef.current.contains(event.target as Node)) {
        setBranchMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [branchMenuOpen])

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
        <div className="absolute top-[42px] left-0 z-40">
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
              aria-label="프로필 메뉴"
              className="absolute top-[54px] right-[28px] z-50 flex w-[236px] flex-col gap-0.5 rounded-md bg-surface p-1.5 shadow-[3px_5px_30px_#00000038]"
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
                className="flex h-8 w-full items-center gap-[9px] rounded-[7px] bg-bg px-2.5"
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
                className="flex h-8 w-full items-center gap-[9px] rounded-[7px] px-2.5"
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
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapsedContext.Provider>
  )
}
