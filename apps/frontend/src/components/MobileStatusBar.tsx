import { BatteryFull, Signal, Wifi } from "lucide-react"

/** component/Mobile Status Bar — 44px: 9:41 / signal·wifi·battery */
export function MobileStatusBar() {
  return (
    <div className="flex h-11 w-full shrink-0 items-center gap-1.5 px-6">
      <span className="pen-text text-[14px] font-semibold tracking-[-0.2px] text-ink">9:41</span>
      <span className="h-px flex-1" />
      <Signal className="size-[15px] text-ink" />
      <Wifi className="size-[15px] text-ink" />
      <BatteryFull className="size-[19px] text-ink" />
    </div>
  )
}
