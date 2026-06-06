import { Waypoints } from "lucide-react"
import type { FormEvent } from "react"
import { useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useSpecraft } from "./api.js"

type AuthMode = "login" | "bootstrap"

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly type?: "email" | "password" | "text"
}) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="pen-text h-11 w-full rounded-[10px] border-none bg-bg px-3.5 text-[14px] tracking-[-0.22px] text-ink outline-none md:h-[38px] md:rounded-sm md:px-3 md:text-[13.5px]"
      />
    </label>
  )
}

export function SignInPage() {
  const navigate = useNavigate()
  const { login, bootstrapAdmin } = useSpecraft()
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("senna@prompt.town")
  const [password, setPassword] = useState("0000000000")
  const [name, setName] = useState("Admin API User")
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    try {
      if (mode === "bootstrap") {
        await bootstrapAdmin({ email, password, name })
      } else {
        await login({ email, password })
      }
      navigate("/settings/keys")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Authentication failed")
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-hidden bg-bg px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Waypoints className="size-[30px] text-ink" />
          <span className="pen-text font-display text-[40px] font-semibold tracking-[-0.8px] text-ink">
            specraft
          </span>
        </div>
        <span className="pen-text text-[14px] tracking-[-0.2px] text-ink-tertiary">
          Single source of spec truth.
        </span>
      </div>
      <form
        onSubmit={submit}
        className="flex w-full max-w-[380px] flex-col gap-3.5 rounded-lg bg-surface p-6"
      >
        <div className="flex rounded-sm bg-input p-0.5">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`h-8 flex-1 rounded-[6px] ${mode === "login" ? "bg-surface" : ""}`}
          >
            <span className="pen-text text-[12.5px]">Login mode</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("bootstrap")}
            className={`h-8 flex-1 rounded-[6px] ${mode === "bootstrap" ? "bg-surface" : ""}`}
          >
            <span className="pen-text text-[12.5px]">Admin setup</span>
          </button>
        </div>
        {mode === "bootstrap" && <Field label="Name" value={name} onChange={setName} />}
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-pill bg-accent"
        >
          <span className="pen-text text-[15px] font-medium tracking-[-0.24px] text-white">
            {mode === "bootstrap" ? "Create admin" : "Sign in"}
          </span>
        </button>
      </form>
    </div>
  )
}

export function JoinInvitePage() {
  const navigate = useNavigate()
  const { token } = useParams<{ token?: string }>()
  const [params] = useSearchParams()
  const inviteToken = token ?? params.get("token") ?? ""
  const { signup } = useSpecraft()
  const [name, setName] = useState("민지")
  const [email, setEmail] = useState("minji@prompt.town")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    try {
      await signup({ invite_token: inviteToken, email, password, name })
      navigate("/specs")
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Signup failed")
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-bg px-6">
      <div className="flex items-center gap-2">
        <Waypoints className="size-5 text-ink" />
        <span className="pen-text font-display text-[24px] font-semibold tracking-[-0.5px]">
          specraft
        </span>
      </div>
      <form
        onSubmit={submit}
        className="flex w-full max-w-[380px] flex-col gap-3.5 rounded-lg bg-surface p-6"
      >
        <span className="pen-text font-display text-[20px] font-semibold tracking-[-0.3px]">
          Join via invite
        </span>
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <span className="pen-text text-[12px] text-danger">{error}</span>}
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-pill bg-accent"
        >
          <span className="pen-text text-[15px] font-medium tracking-[-0.24px] text-white">
            Create account
          </span>
        </button>
      </form>
    </div>
  )
}
