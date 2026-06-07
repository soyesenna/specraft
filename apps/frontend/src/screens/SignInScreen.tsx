import { Waypoints } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ButtonPill } from "../components/buttons.js"
import { Field } from "../components/Field.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { useSpecraft } from "../live/api.js"

/** 01 · Sign In (1440 / C4g32) + M01 · Sign In (390 / KWVCw) */
export function SignInScreen() {
  const navigate = useNavigate()
  const { login } = useSpecraft()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      await login({ email, password })
      navigate("/specs")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Authentication failed")
    } finally {
      setPending(false)
    }
  }

  const card = (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-3.5 rounded-lg bg-surface p-5 md:w-[360px] md:p-[26px]"
    >
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        name="email"
        autoFocus
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        name="password"
      />
      {error && (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{error}</span>
      )}
      <ButtonPill
        type="submit"
        pending={pending}
        className="h-[46px] w-full md:h-10"
        labelClassName="font-medium tracking-[-0.24px]"
      >
        Sign in
      </ButtonPill>
      <div className="flex w-full justify-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Password reset is not available yet"
          className="pen-text text-[12.5px] tracking-[-0.12px] text-link opacity-50"
        >
          Forgot password?
        </button>
      </div>
    </form>
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
        <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
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
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
    </>
  )
}
