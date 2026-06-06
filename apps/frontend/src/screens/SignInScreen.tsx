import { Waypoints } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { MobileStatusBar } from "../components/MobileStatusBar.js"

/** 01 · Sign In (1440) + M01 · Sign In (390) */
export function SignInScreen() {
  const navigate = useNavigate()

  const card = (
    <div className="flex w-full flex-col gap-3.5 rounded-lg bg-surface p-5 md:w-[360px] md:p-[26px]">
      <label className="flex w-full flex-col gap-1.5">
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">Email</span>
        <input
          type="email"
          defaultValue="senna@prompt.town"
          className="pen-text h-11 w-full rounded-[10px] border-none bg-bg px-3.5 text-[14px] tracking-[-0.22px] text-ink outline-none md:h-[38px] md:rounded-sm md:px-3 md:text-[13.5px] md:tracking-[-0.2px]"
        />
      </label>
      <label className="flex w-full flex-col gap-1.5">
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
          Password
        </span>
        <input
          type="password"
          defaultValue="0000000000"
          className="pen-text h-11 w-full rounded-[10px] border-none bg-bg px-3.5 text-[14px] tracking-[-0.22px] text-ink outline-none md:h-[38px] md:rounded-sm md:px-3 md:text-[13.5px] md:tracking-[-0.2px]"
        />
      </label>
      <button
        type="button"
        onClick={() => navigate("/specs")}
        className="flex h-[46px] w-full items-center justify-center rounded-pill bg-accent md:h-10"
      >
        <span className="pen-text text-[15px] font-medium tracking-[-0.24px] text-white">
          Sign in
        </span>
      </button>
      <div className="flex w-full justify-center">
        <button type="button" className="pen-text text-[12.5px] tracking-[-0.12px] text-link">
          Forgot password?
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ───── 데스크톱 01 ───── */}
      <div className="hidden h-full flex-col items-center justify-center gap-9 overflow-hidden bg-bg md:flex">
        <div className="flex flex-col items-center gap-3.5">
          <div className="flex items-center gap-3">
            <Waypoints className="size-[30px] text-ink" />
            <span className="pen-text font-display text-[40px] font-semibold tracking-[-0.8px] text-ink">
              specraft
            </span>
          </div>
          <span className="pen-text font-display text-[16px] tracking-[-0.2px] text-ink-tertiary">
            Single source of spec truth.
          </span>
        </div>
        {card}
        <span className="pen-text text-[11px] tracking-[-0.1px] text-[#00000052]">
          specraft v1 · self-hosted · spec integrity over availability
        </span>
      </div>

      {/* ───── 모바일 M01 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-8 px-6">
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-[9px]">
              <Waypoints className="size-[23px] text-ink" />
              <span className="pen-text font-display text-[30px] font-semibold tracking-[-0.6px] text-ink">
                specraft
              </span>
            </div>
            <span className="pen-text font-display text-[13.5px] tracking-[-0.2px] text-ink-tertiary">
              Single source of spec truth.
            </span>
          </div>
          {card}
        </div>
        <div className="flex h-14 w-full shrink-0 items-center justify-center">
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-[#00000052]">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
    </>
  )
}
