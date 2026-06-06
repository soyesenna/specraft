import type { LucideIcon } from "lucide-react"
import { Activity, GitMerge, Key, MessageCircle, Settings, Waypoints } from "lucide-react"
import { type ReactNode, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useSpecraft } from "./api.js"

type NavItem = {
  readonly label: string
  readonly to: string
  readonly icon: LucideIcon
}

const navItems: readonly NavItem[] = [
  { label: "Specs", to: "/specs", icon: Waypoints },
  { label: "Query", to: "/query", icon: MessageCircle },
  { label: "Activity", to: "/activity", icon: Activity },
  { label: "Conflicts", to: "/conflicts", icon: GitMerge },
  { label: "Settings", to: "/settings/git", icon: Settings },
  { label: "API keys", to: "/settings/keys", icon: Key },
]

function isActive(pathname: string, to: string): boolean {
  return pathname === to || (to !== "/specs" && pathname.startsWith(to))
}

export function LiveShell({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  const { member, sessionChecked, sessionError } = useSpecraft()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionChecked && !member) {
      navigate("/signin", { replace: true })
    }
  }, [member, navigate, sessionChecked])

  return (
    <div className="flex h-full min-h-[640px] flex-col overflow-hidden bg-bg text-ink">
      <header className="flex h-12 shrink-0 items-center gap-7 border-b border-hairline bg-nav-glass px-7 backdrop-blur-[20px]">
        <Link to="/specs" className="flex items-center gap-2">
          <Waypoints className="size-[17px]" />
          <span className="pen-text font-display text-[16px] font-semibold tracking-[-0.3px]">
            specraft
          </span>
        </Link>
        <span className="h-px flex-1" />
        <span className="pen-text text-[12px] tracking-[-0.12px] text-ink-tertiary">
          {sessionError ?? (sessionChecked ? "Live API connected" : "Connecting...")}
        </span>
        <span className="flex size-[26px] items-center justify-center rounded-[13px] bg-ink">
          <span className="pen-text text-[10px] font-semibold tracking-[0.2px] text-white">
            {(member?.name ?? "SP").slice(0, 2).toUpperCase()}
          </span>
        </span>
        {member && (
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
            {member.name}
          </span>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[216px] shrink-0 flex-col gap-0.5 border-r border-hairline px-3 py-3.5">
          {navItems.map(({ label, to, icon: Icon }) => {
            const active = isActive(location.pathname, to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex h-9 items-center gap-2.5 rounded-[7px] px-[11px] ${
                  active ? "bg-surface font-semibold text-ink" : "text-ink-secondary"
                }`}
              >
                <Icon className="size-[15px]" />
                <span className="pen-text text-[13px] tracking-[-0.2px]">{label}</span>
              </Link>
            )
          })}
        </nav>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-[64px] shrink-0 items-center gap-3.5 px-7">
            <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px]">
              {title}
            </h1>
            <span className="rounded-pill bg-input px-[9px] py-[3px]">
              <span className="pen-text text-[10.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                dev
              </span>
            </span>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
