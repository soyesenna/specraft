import type { AdminInvite, ApiKey, Member } from "@specraft/shared"
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Key,
  LogOut,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react"
import {
  type ComponentType,
  type ReactNode,
  type SVGProps,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { IconButton } from "../components/IconButton.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SettingsNav, type SettingsSection } from "../components/SettingsNav.js"
import { cn } from "../lib/cn.js"
import { useSpecraft } from "./api.js"
import { LiveShell } from "./LiveShell.js"
import {
  CardHeader,
  ColumnHead,
  EyeOffIcon,
  FlexColumnHead,
  InviteRow,
  KeyRow,
  MemberRow,
  type MemberStatus,
  MobileInviteRow,
  MobileKeyRow,
  MobileMemberRow,
  MobileNavRow,
  PrimaryButton,
  RevealBanner,
  SecondaryButton,
} from "./SettingsContent.js"

const SECTIONS: SettingsSection[] = ["general", "git", "models", "members", "invites", "keys"]

function sectionFromParam(section: string | undefined): SettingsSection | null {
  if (section === undefined) {
    return null
  }
  return SECTIONS.includes(section as SettingsSection) ? (section as SettingsSection) : null
}

/* ───────────────────────── 공용 설정 데이터 훅 ───────────────────────── */

/**
 * 활성 섹션이 필요로 하는 데이터만 로드한다. (members/invites/keys 는 해당 섹션에서만 조회)
 * 데스크톱·모바일 두 분기가 동시에 마운트되므로, 두 분기가 보는 섹션의 합집합으로 판단한다.
 */
function useSettingsData(section: SettingsSection | null) {
  const { client } = useSpecraft()

  const desktopSection: SettingsSection = section ?? "git"
  const needsSettings =
    desktopSection === "git" ||
    desktopSection === "models" ||
    section === "git" ||
    section === "models"
  const needsKeys = section === "keys"
  const needsMembers = section === "members"
  const needsInvites = section === "invites"

  const [gitRemoteUrl, setGitRemoteUrl] = useState("")
  const [credentialConfigured, setCredentialConfigured] = useState(false)
  const [ingestModel, setIngestModel] = useState("")
  const [queryModel, setQueryModel] = useState("")

  const [keys, setKeys] = useState<readonly ApiKey[]>([])
  const [members, setMembers] = useState<readonly Member[]>([])
  const [invites, setInvites] = useState<readonly AdminInvite[]>([])

  useEffect(() => {
    if (!needsSettings) {
      return
    }
    let active = true
    void client.getAdminSettings().then((response) => {
      if (!active) {
        return
      }
      setGitRemoteUrl(response.git_remote_url ?? "")
      setCredentialConfigured(response.credential_configured)
      setIngestModel(response.model_ingest ?? "")
      setQueryModel(response.model_query ?? "")
    })
    return () => {
      active = false
    }
  }, [client, needsSettings])

  useEffect(() => {
    if (!needsKeys) {
      return
    }
    let active = true
    void client.listApiKeys().then((response) => {
      if (active) {
        setKeys(response.keys)
      }
    })
    return () => {
      active = false
    }
  }, [client, needsKeys])

  useEffect(() => {
    if (!needsMembers) {
      return
    }
    let active = true
    void client.listAdminMembers().then((response) => {
      if (active) {
        setMembers(response.members)
      }
    })
    return () => {
      active = false
    }
  }, [client, needsMembers])

  useEffect(() => {
    if (!needsInvites) {
      return
    }
    let active = true
    void client.listAdminInvites().then((response) => {
      if (active) {
        setInvites(response.invites)
      }
    })
    return () => {
      active = false
    }
  }, [client, needsInvites])

  const refreshKeys = useCallback(async () => {
    const listed = await client.listApiKeys()
    setKeys(listed.keys)
  }, [client])

  const refreshInvites = useCallback(async () => {
    const listed = await client.listAdminInvites()
    setInvites(listed.invites)
  }, [client])

  return {
    client,
    gitRemoteUrl,
    setGitRemoteUrl,
    credentialConfigured,
    ingestModel,
    setIngestModel,
    queryModel,
    setQueryModel,
    keys,
    members,
    invites,
    refreshKeys,
    refreshInvites,
  }
}

type SettingsData = ReturnType<typeof useSettingsData>

function nonEmpty(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/* ───────────────────────── 데스크톱 콘텐츠 ───────────────────────── */

function GitContent({ data }: { data: SettingsData }) {
  const { client, gitRemoteUrl, setGitRemoteUrl, credentialConfigured } = data
  const [credentialMode, setCredentialMode] = useState<"ssh" | "https">("ssh")
  const [gitSaved, setGitSaved] = useState(false)
  const [gitSaving, setGitSaving] = useState(false)
  const [gitError, setGitError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<"idle" | "ok" | "failed">("idle")
  const [testing, setTesting] = useState(false)

  async function saveGit(): Promise<void> {
    if (gitSaving) {
      return
    }
    setGitSaving(true)
    setGitError(null)
    try {
      await client.updateAdminSettings({ git_remote_url: nonEmpty(gitRemoteUrl) })
      setGitSaved(true)
      setTimeout(() => setGitSaved(false), 3000)
    } catch (error) {
      setGitError(error instanceof Error ? error.message : "저장에 실패했습니다")
    } finally {
      setGitSaving(false)
    }
  }

  async function testConnection(): Promise<void> {
    setTesting(true)
    try {
      const response = await client.testGitConnection()
      setTestResult(response.status === "ok" ? "ok" : "failed")
    } catch {
      setTestResult("failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-md bg-surface px-6 py-[22px]">
      <div className="flex w-full flex-col gap-1">
        <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
          Git integration
        </span>
        <span className="pen-text w-full text-[12.5px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary">
          코드 저장소 미러링에 사용할 remote와 credential — 서버는 코드 repo에 read-only로만
          접근합니다.
        </span>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <label className="flex w-full flex-col gap-1.5">
          <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
            Remote URL
          </span>
          <div className="w-full rounded-sm focus-within:ring-2 focus-within:ring-accent">
            <input
              value={gitRemoteUrl}
              onChange={(event) => {
                setGitRemoteUrl(event.currentTarget.value)
                setGitSaved(false)
                setGitError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void saveGit()
                }
              }}
              className="pen-text h-9 w-full rounded-sm border-none bg-bg px-3 font-mono text-[12.5px] text-ink outline-none"
            />
          </div>
        </label>
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              credentialConfigured ? "bg-success" : "bg-separator",
            )}
          />
          <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
            {credentialConfigured ? "Connected · credential 등록됨" : "credential 미등록"}
          </span>
        </span>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex w-full items-center gap-2.5">
          <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
            Credential
          </span>
          <div className="flex items-center gap-0.5 rounded-sm bg-input p-0.5">
            <button
              type="button"
              onClick={() => setCredentialMode("ssh")}
              aria-pressed={credentialMode === "ssh"}
              className={cn(
                "flex items-center rounded-[6px] px-2.5 py-[3px] transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
                credentialMode === "ssh" && "bg-surface shadow-[0_1px_3px_#0000001F]",
              )}
            >
              <span
                className={cn(
                  "pen-text text-[11.5px] font-medium tracking-[-0.1px]",
                  credentialMode === "ssh" ? "text-ink" : "text-ink-tertiary",
                )}
              >
                SSH deploy key
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCredentialMode("https")}
              aria-pressed={credentialMode === "https"}
              className={cn(
                "flex items-center rounded-[6px] px-2.5 py-[3px] transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
                credentialMode === "https" && "bg-surface shadow-[0_1px_3px_#0000001F]",
              )}
            >
              <span
                className={cn(
                  "pen-text text-[11.5px] font-medium tracking-[-0.1px]",
                  credentialMode === "https" ? "text-ink" : "text-ink-tertiary",
                )}
              >
                HTTPS PAT
              </span>
            </button>
          </div>
        </div>
        <div className="flex h-9 w-full items-center gap-2 rounded-sm bg-bg px-3">
          <span className="pen-text font-mono text-[12.5px] text-ink">
            {credentialConfigured
              ? credentialMode === "ssh"
                ? "ssh-ed25519 ••••••••••••••••••••"
                : "ghp_••••••••••••••••••••"
              : "미설정"}
          </span>
          <span className="h-px flex-1" />
          <EyeOffIcon />
        </div>
        <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
          credential은 SPECRAFT_SECRET 파생 키로 암호화 저장됩니다
        </span>
      </div>
      <div className="flex w-full items-center gap-2.5">
        <SecondaryButton onClick={testConnection} disabled={testing}>
          Test connection
        </SecondaryButton>
        {testResult !== "idle" && (
          <span
            className={cn(
              "pen-text text-[12px] tracking-[-0.12px]",
              testResult === "ok" ? "text-success" : "text-danger",
            )}
          >
            {testResult === "ok" ? "연결 성공" : "연결 실패"}
          </span>
        )}
        <span className="h-px flex-1" />
        <PrimaryButton onClick={saveGit} disabled={gitSaving}>
          Save
        </PrimaryButton>
      </div>
      {gitError ? (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{gitError}</span>
      ) : gitSaved ? (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-success">
          Settings saved from API
        </span>
      ) : null}
    </section>
  )
}

function ModelsContent({ data }: { data: SettingsData }) {
  const { client, ingestModel, setIngestModel, queryModel, setQueryModel } = data
  const ingestModelId = useId()
  const queryModelId = useId()
  const [modelsSaved, setModelsSaved] = useState(false)
  const [modelsSaving, setModelsSaving] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  async function saveModels(): Promise<void> {
    if (modelsSaving) {
      return
    }
    setModelsSaving(true)
    setModelsError(null)
    try {
      await client.updateAdminSettings({
        model_ingest: nonEmpty(ingestModel),
        model_query: nonEmpty(queryModel),
      })
      setModelsSaved(true)
      setTimeout(() => setModelsSaved(false), 3000)
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "저장에 실패했습니다")
    } finally {
      setModelsSaving(false)
    }
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-md bg-surface px-6 py-[22px]">
      <div className="flex w-full flex-col gap-1">
        <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
          Models
        </span>
        <span className="pen-text w-full text-[12.5px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary">
          OpenRouter 모델 슬러그 — ingest용과 query용을 분리 설정할 수 있습니다.
        </span>
      </div>
      <div className="flex w-full gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor={ingestModelId}
            className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink"
          >
            Ingest model
          </label>
          <div className="w-full rounded-sm focus-within:ring-2 focus-within:ring-accent">
            <input
              id={ingestModelId}
              value={ingestModel}
              onChange={(event) => {
                setIngestModel(event.currentTarget.value)
                setModelsSaved(false)
                setModelsError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void saveModels()
                }
              }}
              className="pen-text h-9 w-full rounded-sm border-none bg-bg px-3 font-mono text-[12px] text-ink outline-none"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor={queryModelId}
            className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink"
          >
            Query model
          </label>
          <div className="w-full rounded-sm focus-within:ring-2 focus-within:ring-accent">
            <input
              id={queryModelId}
              value={queryModel}
              onChange={(event) => {
                setQueryModel(event.currentTarget.value)
                setModelsSaved(false)
                setModelsError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void saveModels()
                }
              }}
              className="pen-text h-9 w-full rounded-sm border-none bg-bg px-3 font-mono text-[12px] text-ink outline-none"
            />
          </div>
        </div>
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        OPENROUTER_API_KEY는 서버 env에서 관리됩니다 — 대시보드에는 노출되지 않습니다
      </span>
      <div className="flex w-full items-center gap-2.5">
        {modelsError ? (
          <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{modelsError}</span>
        ) : modelsSaved ? (
          <span className="pen-text text-[12px] tracking-[-0.12px] text-success">
            Models saved from API
          </span>
        ) : null}
        <span className="h-px flex-1" />
        <PrimaryButton onClick={saveModels} disabled={modelsSaving}>
          Save
        </PrimaryButton>
      </div>
    </section>
  )
}

function KeysContent({ data }: { data: SettingsData }) {
  const { client, keys, refreshKeys } = data
  const [createdKey, setCreatedKey] = useState<{ id: string; api_key: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(): Promise<void> {
    if (generating) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const response = await client.createApiKey({ name: "Dashboard key" })
      setCreatedKey({ id: response.id, api_key: response.api_key })
      await refreshKeys()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "키 발급에 실패했습니다")
    } finally {
      setGenerating(false)
    }
  }

  async function revoke(id: string): Promise<void> {
    if (revokingId !== null) {
      return
    }
    setRevokingId(id)
    setError(null)
    try {
      await client.deleteApiKey({ id })
      await refreshKeys()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "키 폐기에 실패했습니다")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <>
      <CardHeader
        title="API keys"
        desc="플러그인 인증용 개인 키 — 본인 키만 발급 · 재발급 · 폐기할 수 있습니다."
        action={
          <PrimaryButton onClick={generate} disabled={generating}>
            Generate new key
          </PrimaryButton>
        }
      />
      {error && (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{error}</span>
      )}
      {createdKey && (
        <RevealBanner
          title="New key created"
          desc="이 키는 지금 한 번만 표시됩니다 — 서버에는 해시만 저장됩니다. SPECRAFT_API_KEY env 또는 ~/.specraft/credentials에 보관하세요."
          value={createdKey.api_key}
          subValue={createdKey.id}
          onClose={() => setCreatedKey(null)}
        />
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <ColumnHead w={170}>NAME</ColumnHead>
          <ColumnHead w={190}>KEY</ColumnHead>
          <ColumnHead w={90}>CREATED</ColumnHead>
          <ColumnHead w={90}>LAST USED</ColumnHead>
          <span className="h-px flex-1" />
        </div>
        {keys.length === 0 ? (
          <div className="flex h-[46px] w-full items-center px-[18px]">
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
              발급된 키가 없습니다.
            </span>
          </div>
        ) : (
          keys.map((key, i) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              border={i < keys.length - 1}
              onRevoke={() => {
                void revoke(key.id)
              }}
            />
          ))
        )}
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        키는 sk-spcrft- prefix로 시작하며, 폐기 즉시 모든 플러그인 요청이 401로 거부됩니다.
      </span>
    </>
  )
}

function MembersContent({ data }: { data: SettingsData }) {
  const { client, members } = data
  const { member: currentMember } = useSpecraft()
  const navigate = useNavigate()
  const [disabledIds, setDisabledIds] = useState<ReadonlySet<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function statusOf(member: Member): MemberStatus {
    return disabledIds.has(member.id) ? "Disabled" : "Active"
  }

  async function toggle(member: Member): Promise<void> {
    if (pendingId !== null) {
      return
    }
    const wasDisabled = disabledIds.has(member.id)
    // 낙관적 업데이트: 즉시 토글 후 실패 시 원복.
    setDisabledIds((current) => {
      const next = new Set(current)
      if (wasDisabled) {
        next.delete(member.id)
      } else {
        next.add(member.id)
      }
      return next
    })
    setPendingId(member.id)
    setError(null)
    try {
      if (wasDisabled) {
        await client.enableAdminMember({ id: member.id })
      } else {
        await client.disableAdminMember({ id: member.id })
      }
    } catch (caught) {
      // 롤백
      setDisabledIds((current) => {
        const next = new Set(current)
        if (wasDisabled) {
          next.add(member.id)
        } else {
          next.delete(member.id)
        }
        return next
      })
      setError(caught instanceof Error ? caught.message : "멤버 상태 변경에 실패했습니다")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <CardHeader
        title={`Members · ${members.length}`}
        desc="프로젝트 멤버와 역할을 관리합니다 — 가입은 초대 링크로만 가능합니다."
        action={
          <PrimaryButton onClick={() => navigate("/settings/invites")}>Create invite</PrimaryButton>
        }
      />
      {error && (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{error}</span>
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <ColumnHead w={170}>MEMBER</ColumnHead>
          <FlexColumnHead>EMAIL</FlexColumnHead>
          <ColumnHead w={90}>ROLE</ColumnHead>
          <ColumnHead w={110}>STATUS</ColumnHead>
          <ColumnHead w={80}>JOINED</ColumnHead>
          <span className="w-[60px] shrink-0" />
        </div>
        {members.map((member, i) => (
          <MemberRow
            key={member.id}
            member={member}
            status={statusOf(member)}
            isYou={member.id === currentMember?.id}
            border={i < members.length - 1}
            onToggle={() => {
              void toggle(member)
            }}
          />
        ))}
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        Disabled 멤버의 api-key는 즉시 401로 거부됩니다 · 역할은 admin / member 2종입니다.
      </span>
    </>
  )
}

function InvitesContent({ data }: { data: SettingsData }) {
  const { client, invites, refreshInvites } = data
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createInvite(): Promise<void> {
    if (creating) {
      return
    }
    setCreating(true)
    setError(null)
    try {
      const response = await client.createAdminInvite()
      setCreatedUrl(response.invite_url)
      await refreshInvites()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "초대 링크 생성에 실패했습니다")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <CardHeader
        title="Invites"
        desc="가입은 초대 링크로만 가능합니다 — 링크는 72시간 후 만료됩니다."
        action={
          <PrimaryButton onClick={createInvite} disabled={creating}>
            Create invite link
          </PrimaryButton>
        }
      />
      {error && (
        <span className="pen-text text-[12px] tracking-[-0.12px] text-danger">{error}</span>
      )}
      {createdUrl && (
        <RevealBanner
          title="Invite link created"
          desc="이 링크를 팀원에게 공유하세요 — 72시간 후 또는 가입 완료 시 만료됩니다."
          value={createdUrl}
          onClose={() => setCreatedUrl(null)}
        />
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <ColumnHead w={200}>LINK</ColumnHead>
          <ColumnHead w={120}>CREATED BY</ColumnHead>
          <ColumnHead w={80}>CREATED</ColumnHead>
          <ColumnHead w={110}>EXPIRES</ColumnHead>
          <FlexColumnHead>STATUS</FlexColumnHead>
        </div>
        {invites.length === 0 ? (
          <div className="flex h-[46px] w-full items-center px-[18px]">
            <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
              생성된 초대 링크가 없습니다.
            </span>
          </div>
        ) : (
          invites.map((invite, i) => (
            <InviteRow key={invite.token} invite={invite} border={i < invites.length - 1} />
          ))
        )}
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        만료되거나 사용된 링크는 재사용할 수 없습니다 · 초대 생성은 admin만 가능합니다.
      </span>
    </>
  )
}

function GeneralContent() {
  const { client } = useSpecraft()
  const [operational, setOperational] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    void client
      .status()
      .then((response) => {
        if (active) {
          setOperational(response.server === "ok")
        }
      })
      .catch(() => {
        if (active) {
          setOperational(false)
        }
      })
    return () => {
      active = false
    }
  }, [client])

  return (
    <section className="flex w-full flex-col gap-4 rounded-md bg-surface px-6 py-[22px]">
      <div className="flex w-full flex-col gap-1">
        <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
          General
        </span>
        <span className="pen-text w-full text-[12.5px] leading-[1.5] tracking-[-0.12px] text-ink-tertiary">
          서버 상태와 워크스페이스 기본값은 활성 specraft 서버가 관리합니다.
        </span>
      </div>
      <div className="flex w-full flex-col overflow-hidden rounded-sm bg-bg">
        <div className="flex h-11 w-full items-center gap-2 border-b border-hairline px-3.5">
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Server</span>
          <span className="h-px flex-1" />
          <span
            className={cn("size-[7px] rounded-full", operational ? "bg-success" : "bg-separator")}
          />
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            {operational === null ? "확인 중" : operational ? "Operational" : "Unavailable"}
          </span>
        </div>
        <div className="flex h-11 w-full items-center gap-2 px-3.5">
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Workspace</span>
          <span className="h-px flex-1" />
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            self-hosted
          </span>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── 모바일 화면 ───────────────────────── */

function MobileHub() {
  const { member, logout } = useSpecraft()
  const navigate = useNavigate()
  const isAdmin = member?.role === "admin"
  const initials = (member?.name ?? member?.email ?? "SP").slice(0, 2).toUpperCase()

  const hubItems: Array<{
    icon: ComponentType<SVGProps<SVGSVGElement>>
    label: string
    to: string
  }> = [
    { icon: SlidersHorizontal, label: "General", to: "/settings/general" },
    { icon: GitBranchIcon, label: "Git integration", to: "/settings/git" },
    { icon: Cpu, label: "Models", to: "/settings/models" },
    { icon: Users, label: "Members", to: "/settings/members" },
    { icon: UserPlus, label: "Invites", to: "/settings/invites" },
    { icon: Key, label: "API keys", to: "/settings/keys" },
  ]

  async function signOut(): Promise<void> {
    await logout()
    navigate("/signin")
  }

  return (
    <>
      <MobileStatusBar />
      <div className="flex w-full items-center px-4 pt-1.5 pb-2.5">
        <h1 className="pen-text m-0 font-display text-[21px] font-semibold tracking-[-0.32px] text-ink">
          Settings
        </h1>
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <div className="flex w-full items-center gap-3 rounded-md bg-surface px-4 py-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[22px] bg-dark-card">
            <span className="pen-text text-[15px] font-semibold text-white">{initials}</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
              {member?.name ?? "Specraft user"}
            </span>
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
              {member?.email ?? "session pending"}
            </span>
          </div>
          {isAdmin && (
            <span className="flex items-center rounded-pill bg-input px-2 py-[3px]">
              <span className="pen-text text-[9.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                ADMIN
              </span>
            </span>
          )}
        </div>
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          {hubItems.map(({ icon: Icon, label, to }, i) => (
            <Link
              key={label}
              to={to}
              className={cn(
                "flex h-[50px] w-full items-center gap-[11px] px-3.5",
                i < hubItems.length - 1 && "border-b border-hairline",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
                <Icon className="size-3.5 text-ink-secondary" />
              </span>
              <span className="pen-text text-[13.5px] tracking-[-0.2px] text-ink">{label}</span>
              <span className="h-px flex-1" />
              <ChevronRight className="size-[15px] text-separator" />
            </Link>
          ))}
        </div>
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="flex h-[50px] w-full items-center gap-[11px] px-3.5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-[#FF3B3014]">
              <LogOut className="size-3.5 text-danger" />
            </span>
            <span className="pen-text text-[13.5px] tracking-[-0.2px] text-danger">Sign out</span>
          </button>
        </div>
        <div className="flex w-full justify-center py-1.5">
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
      <MobileTabBar active="profile" />
    </>
  )
}

function MobileSection({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title={title} badge={badge} onBack={() => navigate("/settings")} />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        {children}
      </div>
    </>
  )
}

function MobileGit({ data }: { data: SettingsData }) {
  const { client, gitRemoteUrl, setGitRemoteUrl, credentialConfigured } = data
  const [credentialMode, setCredentialMode] = useState<"ssh" | "https">("ssh")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    if (saving) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await client.updateAdminSettings({ git_remote_url: nonEmpty(gitRemoteUrl) })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileSection title="Git integration">
      <div className="flex w-full flex-col gap-[9px] rounded-md bg-surface p-3.5">
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
          Remote URL
        </span>
        <div className="w-full rounded-[10px] focus-within:ring-2 focus-within:ring-accent">
          <input
            value={gitRemoteUrl}
            onChange={(event) => {
              setGitRemoteUrl(event.currentTarget.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void save()
              }
            }}
            className="pen-text h-[42px] w-full rounded-[10px] border-none bg-bg px-3 font-mono text-[16px] text-ink outline-none"
          />
        </div>
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              credentialConfigured ? "bg-success" : "bg-separator",
            )}
          />
          <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
            {credentialConfigured ? "Connected · credential 등록됨" : "credential 미등록"}
          </span>
        </span>
      </div>
      <div className="flex w-full flex-col gap-[9px] rounded-md bg-surface p-3.5">
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
          Credential
        </span>
        <div className="flex w-full gap-0.5 rounded-[9px] bg-input p-0.5">
          <button
            type="button"
            onClick={() => setCredentialMode("ssh")}
            aria-pressed={credentialMode === "ssh"}
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center justify-center rounded-[7px] transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
              credentialMode === "ssh" && "bg-surface shadow-[0_1px_3px_#0000001F]",
            )}
          >
            <span
              className={cn(
                "pen-text text-[11.5px] font-medium tracking-[-0.1px]",
                credentialMode === "ssh" ? "text-ink" : "text-ink-tertiary",
              )}
            >
              SSH deploy key
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCredentialMode("https")}
            aria-pressed={credentialMode === "https"}
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center justify-center rounded-[7px] transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-standard)]",
              credentialMode === "https" && "bg-surface shadow-[0_1px_3px_#0000001F]",
            )}
          >
            <span
              className={cn(
                "pen-text text-[11.5px] font-medium tracking-[-0.1px]",
                credentialMode === "https" ? "text-ink" : "text-ink-tertiary",
              )}
            >
              HTTPS PAT
            </span>
          </button>
        </div>
        <div className="flex h-[42px] w-full items-center gap-2 rounded-[10px] bg-bg px-3">
          <span className="pen-text font-mono text-[11px] text-ink">
            {credentialConfigured ? "ssh-ed25519 ••••••••••••••" : "미설정"}
          </span>
          <span className="h-px flex-1" />
          <EyeOffIcon />
        </div>
        <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
          credential은 SPECRAFT_SECRET 파생 키로 암호화 저장됩니다
        </span>
      </div>
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={() => {
            void client.testGitConnection().catch(() => undefined)
          }}
          className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] bg-input"
        >
          <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-ink">
            Test connection
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            void save()
          }}
          disabled={saving}
          className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] bg-accent disabled:opacity-50"
        >
          <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-white">
            Save
          </span>
        </button>
      </div>
      {error && (
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-danger">{error}</span>
      )}
      <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
        서버는 코드 repo에 read-only로만 접근합니다
      </span>
    </MobileSection>
  )
}

function MobileModels({ data }: { data: SettingsData }) {
  const { client, ingestModel, setIngestModel, queryModel, setQueryModel } = data
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    if (saving) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await client.updateAdminSettings({
        model_ingest: nonEmpty(ingestModel),
        model_query: nonEmpty(queryModel),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileSection title="Models">
      <div className="flex w-full flex-col gap-3 rounded-md bg-surface p-3.5">
        <label className="flex w-full flex-col gap-1.5">
          <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
            Ingest model
          </span>
          <div className="w-full rounded-[10px] focus-within:ring-2 focus-within:ring-accent">
            <input
              value={ingestModel}
              onChange={(event) => {
                setIngestModel(event.currentTarget.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void save()
                }
              }}
              className="pen-text h-[42px] w-full rounded-[10px] border-none bg-bg px-3 font-mono text-[16px] text-ink outline-none"
            />
          </div>
        </label>
        <label className="flex w-full flex-col gap-1.5">
          <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
            Query model
          </span>
          <div className="w-full rounded-[10px] focus-within:ring-2 focus-within:ring-accent">
            <input
              value={queryModel}
              onChange={(event) => {
                setQueryModel(event.currentTarget.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void save()
                }
              }}
              className="pen-text h-[42px] w-full rounded-[10px] border-none bg-bg px-3 font-mono text-[16px] text-ink outline-none"
            />
          </div>
        </label>
        <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
          OpenRouter 슬러그 — ingest / query 분리 설정. OPENROUTER_API_KEY는 서버 env에서
          관리됩니다.
        </span>
      </div>
      {error && (
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-danger">{error}</span>
      )}
      <button
        type="button"
        onClick={() => {
          void save()
        }}
        disabled={saving}
        className="flex h-11 w-full items-center justify-center rounded-[10px] bg-accent disabled:opacity-50"
      >
        <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-white">
          Save
        </span>
      </button>
    </MobileSection>
  )
}

function MobileMembers({ data }: { data: SettingsData }) {
  const { members } = data
  const { member: currentMember } = useSpecraft()
  const navigate = useNavigate()

  return (
    <MobileSection
      title="Members"
      badge={
        <span className="flex items-center rounded-pill bg-input px-2 py-[3px]">
          <span className="pen-text text-[10px] font-semibold text-ink-secondary">
            {members.length}
          </span>
        </span>
      }
    >
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        {members.map((member, i) => (
          <MobileMemberRow
            key={member.id}
            member={member}
            status="Active"
            isYou={member.id === currentMember?.id}
            border={i < members.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate("/settings/invites")}
        className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent"
      >
        <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
          Create invite
        </span>
      </button>
      <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
        Disabled 멤버의 api-key는 즉시 401로 거부됩니다 · 역할은 admin / member 2종
      </span>
    </MobileSection>
  )
}

function MobileInvites({ data }: { data: SettingsData }) {
  const { client, invites, refreshInvites } = data
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createInvite(): Promise<void> {
    if (creating) {
      return
    }
    setCreating(true)
    setError(null)
    try {
      const response = await client.createAdminInvite()
      setCreatedUrl(response.invite_url)
      await refreshInvites()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "초대 링크 생성에 실패했습니다")
    } finally {
      setCreating(false)
    }
  }

  return (
    <MobileSection title="Invites">
      {createdUrl && (
        <RevealBanner
          compact
          title="Invite link created"
          desc="이 링크를 팀원에게 공유하세요 — 72시간 후 또는 가입 완료 시 만료됩니다."
          value={createdUrl}
          onClose={() => setCreatedUrl(null)}
        />
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        {invites.length === 0 ? (
          <div className="flex h-14 w-full items-center px-3.5">
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
              생성된 초대 링크가 없습니다.
            </span>
          </div>
        ) : (
          invites.map((invite, i) => (
            <MobileInviteRow key={invite.token} invite={invite} border={i < invites.length - 1} />
          ))
        )}
      </div>
      {error && (
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-danger">{error}</span>
      )}
      <button
        type="button"
        onClick={() => {
          void createInvite()
        }}
        disabled={creating}
        className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent disabled:opacity-50"
      >
        <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
          Create invite link
        </span>
      </button>
      <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
        만료되거나 사용된 링크는 재사용할 수 없습니다 · 초대 생성은 admin만 가능합니다
      </span>
    </MobileSection>
  )
}

function MobileKeys({ data }: { data: SettingsData }) {
  const { client, keys, refreshKeys } = data
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(): Promise<void> {
    if (generating) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const response = await client.createApiKey({ name: "Dashboard key" })
      setCreatedKey(response.api_key)
      await refreshKeys()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "키 발급에 실패했습니다")
    } finally {
      setGenerating(false)
    }
  }

  async function revoke(id: string): Promise<void> {
    if (revokingId !== null) {
      return
    }
    setRevokingId(id)
    setError(null)
    try {
      await client.deleteApiKey({ id })
      await refreshKeys()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "키 폐기에 실패했습니다")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <MobileSection title="API keys">
      {createdKey && (
        <RevealBanner
          compact
          title="New key created"
          desc="이 키는 지금 한 번만 표시됩니다 — 서버에는 해시만 저장됩니다."
          value={createdKey}
          onClose={() => setCreatedKey(null)}
        />
      )}
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        {keys.length === 0 ? (
          <div className="flex h-14 w-full items-center px-3.5">
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
              발급된 키가 없습니다.
            </span>
          </div>
        ) : (
          keys.map((key, i) => (
            <MobileKeyRow
              key={key.id}
              apiKey={key}
              border={i < keys.length - 1}
              onRevoke={() => {
                void revoke(key.id)
              }}
            />
          ))
        )}
      </div>
      {error && (
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-danger">{error}</span>
      )}
      <button
        type="button"
        onClick={() => {
          void generate()
        }}
        disabled={generating}
        className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent disabled:opacity-50"
      >
        <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
          Generate new key
        </span>
      </button>
      <div className="flex w-full justify-center">
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          폐기 즉시 모든 플러그인 요청이 401로 거부됩니다
        </span>
      </div>
    </MobileSection>
  )
}

function MobileGeneral() {
  const { client } = useSpecraft()
  const [operational, setOperational] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    void client
      .status()
      .then((response) => {
        if (active) {
          setOperational(response.server === "ok")
        }
      })
      .catch(() => {
        if (active) {
          setOperational(false)
        }
      })
    return () => {
      active = false
    }
  }, [client])

  return (
    <MobileSection title="General">
      <div className="flex w-full px-1 pt-1">
        <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
          SERVER
        </span>
      </div>
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-11 w-full items-center gap-2 border-b border-hairline px-3.5">
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Status</span>
          <span className="h-px flex-1" />
          <span
            className={cn("size-[7px] rounded-full", operational ? "bg-success" : "bg-separator")}
          />
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            {operational === null ? "확인 중" : operational ? "Operational" : "Unavailable"}
          </span>
        </div>
        <div className="flex h-11 w-full items-center gap-2 px-3.5">
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">Workspace</span>
          <span className="h-px flex-1" />
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            self-hosted
          </span>
        </div>
      </div>
      <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
        서버 상태와 워크스페이스 기본값은 활성 specraft 서버가 관리합니다.
      </span>
    </MobileSection>
  )
}

/* ───────────────────────── 진입점 ───────────────────────── */

export function SettingsPage() {
  const navigate = useNavigate()
  const params = useParams<{ section?: string }>()
  const rawSection = params.section
  const section = sectionFromParam(rawSection)
  const data = useSettingsData(section)

  // 알 수 없는 섹션은 모바일 루트로 수렴
  if (rawSection !== undefined && section === null) {
    return <Navigate to="/settings" replace />
  }

  // 데스크톱: General 전용 화면이 없으므로(09=Git&Models 정본) git으로 수렴 — General 만 별도 카드
  const desktopSection: SettingsSection = section ?? "git"
  const showAdminBadge = desktopSection !== "keys"

  return (
    <>
      {/* ───── 데스크톱 09~12 ───── */}
      <div className="hidden h-full md:block">
        <LiveShell
          title="Settings"
          showSidebar={false}
          titlePrefix={<IconButton icon={ChevronLeft} onClick={() => navigate("/specs")} />}
          titleMeta={
            showAdminBadge ? (
              <span className="flex items-center rounded-pill bg-input px-[9px] py-[3px]">
                <span className="pen-text text-[10.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                  ADMIN
                </span>
              </span>
            ) : (
              <span />
            )
          }
        >
          <div className="flex min-h-0 flex-1 gap-[26px] px-7 pt-1 pb-7">
            <SettingsNav active={desktopSection} />
            <div className="flex min-h-0 max-w-[660px] min-w-0 flex-1 flex-col gap-[18px] overflow-y-auto">
              {desktopSection === "general" && <GeneralContent />}
              {desktopSection === "git" && <GitContent data={data} />}
              {desktopSection === "models" && <ModelsContent data={data} />}
              {desktopSection === "keys" && <KeysContent data={data} />}
              {desktopSection === "members" && <MembersContent data={data} />}
              {desktopSection === "invites" && <InvitesContent data={data} />}
            </div>
          </div>
        </LiveShell>
      </div>

      {/* ───── 모바일 M09~M15 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        {section === null && <MobileHub />}
        {section === "general" && <MobileGeneral />}
        {section === "git" && <MobileGit data={data} />}
        {section === "models" && <MobileModels data={data} />}
        {section === "members" && <MobileMembers data={data} />}
        {section === "invites" && <MobileInvites data={data} />}
        {section === "keys" && <MobileKeys data={data} />}
      </div>
    </>
  )
}
