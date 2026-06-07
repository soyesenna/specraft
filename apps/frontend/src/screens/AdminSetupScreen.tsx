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

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    try {
      await bootstrapAdmin({ email, password, name })
      navigate("/specs")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Admin setup failed")
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
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="최소 12자"
      />
      {error && (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{error}</span>
      )}
      <ButtonPill
        type="submit"
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
        <span className="pen-text text-[11px] tracking-[-0.1px] text-[#00000052]">
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
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-[#00000052]">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
    </>
  )
}
