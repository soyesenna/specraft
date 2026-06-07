import { Waypoints } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ButtonPill } from "../components/buttons.js"
import { Field } from "../components/Field.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { useSpecraft } from "../live/api.js"

/** 02 · Join via Invite (1440 / sM0yJ) + M02 (390 / m27YwG) */
export function JoinInviteScreen() {
  const navigate = useNavigate()
  const { token } = useParams<{ token?: string }>()
  const [params] = useSearchParams()
  const inviteToken = token ?? params.get("token") ?? ""
  const { signup } = useSpecraft()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // 서버 최소 길이 규칙(12자)을 제출 전 클라이언트에서 선검증해
  // 원시 서버 에러 대신 actionable 한 문구를 Field 하단에 노출한다.
  const PASSWORD_MIN = 12

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`)
      return
    }
    setPending(true)
    try {
      await signup({ invite_token: inviteToken, email, password, name })
      navigate("/specs")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Signup failed")
    } finally {
      setPending(false)
    }
  }

  const card = (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-[13px] rounded-lg bg-surface p-5 md:w-[380px] md:gap-3.5 md:p-[26px]"
    >
      <div className="flex w-full flex-col gap-1 md:gap-[5px]">
        <span className="pen-text font-display text-[19px] font-semibold tracking-[-0.3px] text-ink md:text-[20px]">
          Join specraft
        </span>
        <p className="pen-text m-0 w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary md:text-[12.5px]">
          수연님이 초대했습니다 · 초대 링크는 72시간 내 만료됩니다
        </p>
      </div>
      <Field label="Name" value={name} onChange={setName} autoFocus />
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        name="email"
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="At least 12 characters"
        autoComplete="new-password"
        name="password"
      />
      {error && (
        <span role="alert" className="pen-text text-[12px] tracking-[-0.12px] text-danger">
          {error}
        </span>
      )}
      <ButtonPill
        type="submit"
        pending={pending}
        className="h-[46px] w-full md:h-10"
        labelClassName="font-medium tracking-[-0.24px]"
      >
        Create account
      </ButtonPill>
    </form>
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
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
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
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            가입은 초대 링크로만 가능합니다
          </span>
        </div>
      </div>
    </>
  )
}
