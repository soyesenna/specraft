import { Cpu, Key, SlidersHorizontal, UserPlus, Users } from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn.js"
import { GitBranchIcon } from "./GitBranchIcon.js"

export type SettingsSection = "general" | "git" | "models" | "members" | "invites" | "keys"

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

const ITEMS: Array<{ key: SettingsSection; icon: NavIcon; label: string; to: string }> = [
  { key: "general", icon: SlidersHorizontal, label: "General", to: "/settings/general" },
  { key: "git", icon: GitBranchIcon, label: "Git integration", to: "/settings/git" },
  { key: "models", icon: Cpu, label: "Models", to: "/settings/models" },
  { key: "members", icon: Users, label: "Members", to: "/settings/members" },
  { key: "invites", icon: UserPlus, label: "Invites", to: "/settings/invites" },
  { key: "keys", icon: Key, label: "API keys", to: "/settings/keys" },
]

type SettingsNavProps = {
  active: SettingsSection
}

/** component/Settings Nav — 216px 세로 메뉴, 32px 행. 선택 = 화이트 필 + ink/600 */
export function SettingsNav({ active }: SettingsNavProps) {
  return (
    <nav aria-label="Settings sections" className="flex w-[216px] shrink-0 flex-col gap-0.5">
      {ITEMS.map(({ key, icon: Icon, label, to }) => {
        const selected = key === active
        return (
          <Link
            key={key}
            to={to}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex h-8 w-full items-center gap-[9px] rounded-[7px] px-[11px] transition-[background-color,color] duration-150 ease-[var(--ease-standard)]",
              selected ? "bg-surface" : "hover:bg-hairline",
            )}
          >
            <Icon className={cn("size-3.5", selected ? "text-ink" : "text-ink-tertiary")} />
            <span
              className={cn(
                "pen-text text-[13px] tracking-[-0.2px]",
                selected ? "font-semibold text-ink" : "text-ink-secondary",
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
