import { Waypoints } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn.js"

type MobileTabBarProps = {
  active: "spec" | "profile"
}

/**
 * component/Mobile Tab Bar — 글래스 2탭 바(Spec | Profile) + 홈 인디케이터.
 * 선택: Spec = accent 아이콘/라벨, Profile = 아바타 accent 1.5px 링 + accent 라벨.
 */
export function MobileTabBar({ active }: MobileTabBarProps) {
  return (
    <div className="flex w-full shrink-0 flex-col border-t border-hairline bg-nav-glass backdrop-blur-[20px]">
      <div className="flex h-[52px] w-full px-2 pt-[5px]">
        <Link
          to="/specs"
          aria-current={active === "spec" ? "page" : undefined}
          className="flex flex-1 flex-col items-center gap-[3px] pt-0.5"
        >
          <Waypoints
            className={cn(
              "size-[22px] transition-colors duration-150 ease-[var(--ease-standard)]",
              active === "spec" ? "text-accent" : "text-ink-tertiary",
            )}
          />
          <span
            className={cn(
              "pen-text text-[10px] font-medium transition-colors duration-150 ease-[var(--ease-standard)]",
              active === "spec" ? "text-accent" : "text-ink-tertiary",
            )}
          >
            Spec
          </span>
        </Link>
        <Link
          to="/settings"
          aria-current={active === "profile" ? "page" : undefined}
          className="flex flex-1 flex-col items-center gap-[3px]"
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-xl bg-dark-card transition-colors duration-150 ease-[var(--ease-standard)]",
              active === "profile"
                ? "border-[1.5px] border-accent"
                : "border-[1.5px] border-transparent",
            )}
          >
            <span className="pen-text text-[9px] font-semibold text-white">SY</span>
          </span>
          <span
            className={cn(
              "pen-text text-[10px] font-medium transition-colors duration-150 ease-[var(--ease-standard)]",
              active === "profile" ? "text-accent" : "text-ink-tertiary",
            )}
          >
            Profile
          </span>
        </Link>
      </div>
      <div className="flex h-[26px] w-full items-center justify-center">
        <span className="h-[5px] w-[134px] rounded-[3px] bg-ink" />
      </div>
    </div>
  )
}
