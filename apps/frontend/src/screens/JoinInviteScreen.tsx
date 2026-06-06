import { Waypoints } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { MobileStatusBar } from "../components/MobileStatusBar.js"

function InviteField({
  label,
  value,
  placeholder,
  type = "text",
}: {
  label: string
  value?: string | undefined
  placeholder?: string | undefined
  type?: "text" | "email" | "password"
}) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">{label}</span>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className="pen-text h-11 w-full rounded-[10px] border-none bg-bg px-3.5 text-[14px] tracking-[-0.22px] text-ink outline-none placeholder:text-ink-tertiary md:h-[38px] md:rounded-s md:px-3 md:text-[13.5px] md:tracking-[-0.2px]"
      />
    </label>
  )
}

/** 02 · Join via Invite (1440) + M02 (390) */
export function JoinInviteScreen() {
  const navigate = useNavigate()

  const card = (
    <div className="flex w-full flex-col gap-[13px] rounded-l bg-surface p-5 md:w-[380px] md:gap-3.5 md:p-[26px]">
      <div className="flex w-full flex-col gap-1 md:gap-[5px]">
        <span className="pen-text font-display text-[19px] font-semibold tracking-[-0.3px] text-ink md:text-[20px]">
          Join specraft
        </span>
        <p className="pen-text m-0 w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary md:text-[12.5px]">
          수연님이 초대했습니다 · 초대 링크는 72시간 내 만료됩니다
        </p>
      </div>
      <InviteField label="Name" value="민지" />
      <InviteField label="Email" type="email" value="minji@prompt.town" />
      <InviteField label="Password" placeholder="최소 12자" />
      <button
        type="button"
        onClick={() => navigate("/specs")}
        className="flex h-[46px] w-full items-center justify-center rounded-pill bg-accent md:h-10"
      >
        <span className="pen-text text-[15px] font-medium tracking-[-0.24px] text-white">
          Create account
        </span>
      </button>
    </div>
  )

  return (
    <>
      {/* ───── 데스크톱 02 ───── */}
      <div className="hidden h-full flex-col items-center justify-center gap-8 overflow-hidden bg-bg md:flex">
        <div className="flex items-center gap-[9px]">
          <Waypoints className="size-5 text-ink" />
          <span className="pen-text font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
            specraft
          </span>
        </div>
        {card}
        <span className="pen-text text-[11px] tracking-[-0.1px] text-[#00000052]">
          가입은 초대 링크로만 가능합니다
        </span>
      </div>

      {/* ───── 모바일 M02 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        <MobileStatusBar />
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[26px] px-6">
          <div className="flex items-center gap-2">
            <Waypoints className="size-[18px] text-ink" />
            <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.4px] text-ink">
              specraft
            </span>
          </div>
          {card}
        </div>
        <div className="flex h-14 w-full shrink-0 items-center justify-center">
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-[#00000052]">
            가입은 초대 링크로만 가능합니다
          </span>
        </div>
      </div>
    </>
  )
}
