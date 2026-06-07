import {
  type AuthLoginRequest,
  type AuthSessionResponse,
  type AuthSignupRequest,
  type BootstrapAdminRequest,
  createSpecraftClient,
  type Member,
  type SpecraftClient,
  SpecraftHttpError,
} from "@specraft/shared"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"

type SpecraftSession = {
  readonly client: SpecraftClient
  readonly member: Member | null
  readonly sessionChecked: boolean
  readonly sessionError: string | null
  readonly login: (request: AuthLoginRequest) => Promise<AuthSessionResponse>
  readonly bootstrapAdmin: (request: BootstrapAdminRequest) => Promise<AuthSessionResponse>
  readonly signup: (request: AuthSignupRequest) => Promise<AuthSessionResponse>
  readonly logout: () => Promise<void>
}

const SpecraftContext = createContext<SpecraftSession | null>(null)

function apiBaseUrl(): string {
  const configured = import.meta.env["VITE_SPECRAFT_API_BASE_URL"]
  if (typeof configured === "string" && configured.length > 0) {
    return configured
  }
  return globalThis.location?.origin ?? "http://127.0.0.1:4173"
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof SpecraftHttpError && error.status === 401
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown error"
}

export function SpecraftProvider({ children }: { readonly children: ReactNode }) {
  const client = useMemo(() => createSpecraftClient({ baseUrl: apiBaseUrl() }), [])
  const [member, setMember] = useState<Member | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client
      .authSession()
      .then((session) => {
        if (active) {
          setMember(session.member)
          setSessionError(null)
        }
      })
      .catch((error: unknown) => {
        if (active && !isUnauthorized(error)) {
          setSessionError(errorMessage(error))
        }
      })
      .finally(() => {
        if (active) {
          setSessionChecked(true)
        }
      })
    return () => {
      active = false
    }
  }, [client])

  async function login(request: AuthLoginRequest): Promise<AuthSessionResponse> {
    const session = await client.authLogin(request)
    setMember(session.member)
    return session
  }

  async function bootstrapAdmin(request: BootstrapAdminRequest): Promise<AuthSessionResponse> {
    const session = await client.bootstrapAdmin(request)
    setMember(session.member)
    return session
  }

  async function signup(request: AuthSignupRequest): Promise<AuthSessionResponse> {
    const session = await client.authSignup(request)
    setMember(session.member)
    return session
  }

  async function logout(): Promise<void> {
    await client.authLogout()
    setMember(null)
    setSessionError(null)
  }

  return (
    <SpecraftContext.Provider
      value={{
        client,
        member,
        sessionChecked,
        sessionError,
        login,
        bootstrapAdmin,
        signup,
        logout,
      }}
    >
      {children}
    </SpecraftContext.Provider>
  )
}

export function useSpecraft(): SpecraftSession {
  const context = useContext(SpecraftContext)
  if (!context) {
    throw new Error("useSpecraft must be used inside SpecraftProvider")
  }
  return context
}
