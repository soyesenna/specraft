import { Waypoints } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ButtonPill } from "../components/buttons.js"
import { Field } from "../components/Field.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { useSpecraft } from "../live/api.js"

/**
 * 01b · Admin Setup — 최초 관리자 부트스트랩 전용 화면(/setup).
 * 로그인 화면에는 노출하지 않으며 직접 URL 접근으로만 사용한다. Sign In 카드 스타일을 공유한다.
 */
export function AdminSetupScreen() {
  const navigate = useNavigate()
  const { bootstrapAdmin } = useSpecraft()
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
      await bootstrapAdmin({ email, password, name })
      navigate("/specs")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Admin setup failed")
    } finally {
      setPending(false)
    }
  }

  const card = (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-3.5 rounded-lg bg-surface p-5 md:w-[360px] md:p-[26px]"
    >
      <div className="flex w-full flex-col gap-1 md:gap-[5px]">
        <span className="pen-text font-display text-[19px] font-semibold tracking-[-0.3px] text-ink md:text-[20px]">
          Admin setup
        </span>
        <p className="pen-text m-0 w-full text-[12px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary md:text-[12.5px]">
          최초 관리자 계정을 생성합니다
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
        Create admin
      </ButtonPill>
    </form>
  )

  return (
    <>
      {/* ───── 데스크톱 ───── */}
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
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
          specraft v1 · self-hosted · spec integrity over availability
        </span>
      </div>

      {/* ───── 모바일 ───── */}
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
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
    </>
  )
}
