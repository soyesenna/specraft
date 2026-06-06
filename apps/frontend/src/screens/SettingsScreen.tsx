import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  Cpu,
  EyeOff,
  Key,
  Link2,
  LogOut,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import type { ComponentType, ReactNode, SVGProps } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { GitBranchIcon } from "../components/GitBranchIcon.js"
import { IconButton } from "../components/IconButton.js"
import { MobileStatusBar } from "../components/MobileStatusBar.js"
import { MobileTabBar } from "../components/MobileTabBar.js"
import { SettingsNav, type SettingsSection } from "../components/SettingsNav.js"
import { TopNav } from "../components/TopNav.js"
import { cn } from "../lib/cn.js"

const SECTIONS: SettingsSection[] = ["general", "git", "models", "members", "invites", "keys"]

/** 09~12 · Settings (1440) + M09~M15 (390) */
export function SettingsScreen() {
  const navigate = useNavigate()
  const params = useParams<{ section?: string }>()
  const section = (params.section ?? null) as SettingsSection | null

  if (section !== null && !SECTIONS.includes(section)) {
    return <Navigate to="/settings" replace />
  }

  // 데스크톱은 General 전용 화면이 없으므로(09=Git&Models 정본) git으로 수렴
  const desktopSection: SettingsSection =
    section === null || section === "general" ? "git" : section
  const showAdminBadge = desktopSection !== "keys"

  return (
    <>
      {/* ───── 데스크톱 09~12 ───── */}
      <div className="hidden h-full md:flex md:flex-col md:overflow-hidden md:bg-bg">
        <TopNav />
        <div className="flex w-full items-center gap-3.5 px-7 py-[18px]">
          <IconButton icon={ChevronLeft} onClick={() => navigate("/specs")} />
          <h1 className="pen-text m-0 font-display text-[28px] font-semibold tracking-[-0.4px] text-ink">
            Settings
          </h1>
          {showAdminBadge && (
            <span className="flex items-center rounded-pill bg-input px-[9px] py-[3px]">
              <span className="pen-text text-[10.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                ADMIN
              </span>
            </span>
          )}
        </div>
        <div className="flex min-h-0 w-full flex-1 gap-[26px] px-7 pt-1 pb-7">
          <SettingsNav active={desktopSection} />
          <div className="flex min-h-0 w-[660px] flex-col gap-[18px] overflow-y-auto">
            {(desktopSection === "git" || desktopSection === "models") && <DesktopGitModels />}
            {desktopSection === "keys" && <DesktopKeys />}
            {desktopSection === "members" && <DesktopMembers />}
            {desktopSection === "invites" && <DesktopInvites />}
          </div>
        </div>
      </div>

      {/* ───── 모바일 M09~M15 ───── */}
      <div className="flex h-full flex-col overflow-hidden bg-bg md:hidden">
        {section === null && <MobileHub />}
        {section === "general" && <MobileGeneral />}
        {section === "git" && <MobileGit />}
        {section === "models" && <MobileModels />}
        {section === "members" && <MobileMembers />}
        {section === "invites" && <MobileInvites />}
        {section === "keys" && <MobileKeys />}
      </div>
    </>
  )
}

/* ───────────────────────── 데스크톱 콘텐츠 ───────────────────────── */

function SettingsField({
  label,
  value,
  mono,
  trailing,
  status,
}: {
  label: string
  value: string
  mono?: boolean
  trailing?: ReactNode
  status?: ReactNode
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
        {label}
      </span>
      <div className="flex h-9 w-full items-center gap-2 rounded-sm bg-bg px-3">
        <span
          className={cn(
            "pen-text text-ink",
            mono ? "font-mono text-[12.5px]" : "text-[13px] tracking-[-0.2px]",
          )}
        >
          {value}
        </span>
        {trailing && (
          <>
            <span className="h-px flex-1" />
            {trailing}
          </>
        )}
      </div>
      {status}
    </div>
  )
}

function DesktopGitModels() {
  return (
    <>
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
        <SettingsField
          label="Remote URL"
          value="git@github.com:prompt-town/specraft.git"
          mono
          status={
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
                Connected · 마지막 fetch 2분 전
              </span>
            </span>
          }
        />
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex w-full items-center gap-2.5">
            <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
              Credential
            </span>
            <div className="flex items-center gap-0.5 rounded-sm bg-input p-0.5">
              <span className="flex items-center rounded-[6px] bg-surface px-2.5 py-[3px] shadow-[0_1px_3px_#0000001F]">
                <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink">
                  SSH deploy key
                </span>
              </span>
              <span className="flex items-center rounded-[6px] px-2.5 py-[3px]">
                <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-tertiary">
                  HTTPS PAT
                </span>
              </span>
            </div>
          </div>
          <div className="flex h-9 w-full items-center gap-2 rounded-sm bg-bg px-3">
            <span className="pen-text font-mono text-[12.5px] text-ink">
              ssh-ed25519 ••••••••••••••••••••
            </span>
            <span className="h-px flex-1" />
            <EyeOff className="size-3.5 text-ink-tertiary" />
          </div>
          <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
            credential은 SPECRAFT_SECRET 파생 키로 암호화 저장됩니다
          </span>
        </div>
        <div className="flex w-full items-center gap-2.5">
          <button
            type="button"
            className="flex items-center justify-center rounded-sm bg-input px-4 py-2"
          >
            <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">
              Test connection
            </span>
          </button>
          <span className="h-px flex-1" />
          <button
            type="button"
            className="flex items-center justify-center rounded-sm bg-accent px-4 py-2"
          >
            <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Save</span>
          </button>
        </div>
      </section>
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
            <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
              Ingest model
            </span>
            <div className="flex h-9 w-full items-center rounded-sm bg-bg px-3">
              <span className="pen-text font-mono text-[12px] text-ink">
                anthropic/claude-sonnet-4.6
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-ink">
              Query model
            </span>
            <div className="flex h-9 w-full items-center rounded-sm bg-bg px-3">
              <span className="pen-text font-mono text-[12px] text-ink">
                anthropic/claude-haiku-4.5
              </span>
            </div>
          </div>
        </div>
        <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
          OPENROUTER_API_KEY는 서버 env에서 관리됩니다 — 대시보드에는 노출되지 않습니다
        </span>
        <div className="flex w-full items-center">
          <span className="h-px flex-1" />
          <button
            type="button"
            className="flex items-center justify-center rounded-sm bg-accent px-4 py-2"
          >
            <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Save</span>
          </button>
        </div>
      </section>
    </>
  )
}

function RevealBanner({
  title,
  desc,
  value,
  compact,
}: {
  title: string
  desc: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-md border-[1.5px] border-accent bg-surface",
        compact ? "gap-[9px] p-3.5" : "gap-2.5 px-5 py-[18px]",
      )}
    >
      <div className={cn("flex w-full items-center", compact ? "gap-[7px]" : "gap-2")}>
        <CircleCheck className={cn("text-success", compact ? "size-3.5" : "size-[15px]")} />
        <span
          className={cn(
            "pen-text font-semibold text-ink",
            compact ? "text-[13.5px] tracking-[-0.2px]" : "text-[14px] tracking-[-0.22px]",
          )}
        >
          {title}
        </span>
        <span className="h-px flex-1" />
        <X className={cn("text-ink-tertiary", compact ? "size-[13px]" : "size-3.5")} />
      </div>
      <p
        className={cn(
          "pen-text m-0 w-full leading-[1.5] text-ink-secondary",
          compact ? "text-[11.5px] tracking-[-0.1px]" : "text-[12.5px] tracking-[-0.12px]",
        )}
      >
        {desc}
      </p>
      <div
        className={cn(
          "flex w-full items-center overflow-hidden rounded-sm bg-dark-card",
          compact ? "gap-2 px-3 py-[9px]" : "gap-2.5 px-3.5 py-2.5",
        )}
      >
        <span
          className={cn(
            "pen-text font-mono whitespace-nowrap text-white",
            compact ? "text-[10px]" : "text-[12px]",
          )}
        >
          {value}
        </span>
        <span className="h-px flex-1" />
        <Copy
          className={cn("shrink-0 text-white-secondary", compact ? "size-[13px]" : "size-3.5")}
        />
      </div>
    </div>
  )
}

function DesktopKeys() {
  return (
    <>
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
            API keys
          </span>
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            플러그인 인증용 개인 키 — 본인 키만 발급 · 재발급 · 폐기할 수 있습니다.
          </span>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-sm bg-accent px-4 py-2"
        >
          <span className="pen-text text-[14px] tracking-[-0.22px] text-white">
            Generate new key
          </span>
        </button>
      </div>
      <RevealBanner
        title="New key created"
        desc="이 키는 지금 한 번만 표시됩니다 — 서버에는 해시만 저장됩니다. SPECRAFT_API_KEY env 또는 ~/.specraft/credentials에 보관하세요."
        value="sk-spcrft-9f3e21bd7a4c1e8f2b6d0a5c3e7f9b1d"
      />
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <KeyHead w={170}>NAME</KeyHead>
          <KeyHead w={190}>KEY</KeyHead>
          <KeyHead w={90}>CREATED</KeyHead>
          <KeyHead w={90}>LAST USED</KeyHead>
          <span className="h-px flex-1" />
        </div>
        <KeyRow
          name="MacBook Pro · Claude Code"
          prefix="sk-spcrft-9f3e…b1d"
          created="오늘"
          used="방금"
          border
        />
        <KeyRow name="Codex CLI" prefix="sk-spcrft-77ab…e42" created="3월 12일" used="어제" />
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        키는 sk-spcrft- prefix로 시작하며, 폐기 즉시 모든 플러그인 요청이 401로 거부됩니다.
      </span>
    </>
  )
}

function KeyHead({ w, children }: { w: number; children: string }) {
  return (
    <span style={{ width: w }} className="shrink-0">
      <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
        {children}
      </span>
    </span>
  )
}

function KeyRow({
  name,
  prefix,
  created,
  used,
  border,
}: {
  name: string
  prefix: string
  created: string
  used: string
  border?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-[46px] w-full items-center gap-3.5 px-[18px]",
        border && "border-b border-hairline",
      )}
    >
      <span className="flex w-[170px] shrink-0 items-center gap-2 overflow-hidden">
        <Key className="size-[13px] shrink-0 text-ink-tertiary" />
        <span className="pen-text truncate text-[13px] font-medium tracking-[-0.2px] text-ink">
          {name}
        </span>
      </span>
      <span className="flex w-[190px] shrink-0 items-center">
        <span className="pen-text font-mono text-[11.5px] text-ink-secondary">{prefix}</span>
      </span>
      <span className="w-[90px] shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {created}
        </span>
      </span>
      <span className="w-[90px] shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">{used}</span>
      </span>
      <span className="h-px flex-1" />
      <button
        type="button"
        className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-danger"
      >
        Revoke
      </button>
    </div>
  )
}

type Member = {
  initials: string
  name: string
  email: string
  role: "ADMIN" | "Member"
  status: "Active" | "Disabled"
  joined: string
  you?: boolean
  action?: "Disable" | "Enable"
}

const MEMBERS: Member[] = [
  {
    initials: "SY",
    name: "수연",
    email: "senna@prompt.town",
    role: "ADMIN",
    status: "Active",
    joined: "5월 2일",
    you: true,
  },
  {
    initials: "MJ",
    name: "민지",
    email: "minji@prompt.town",
    role: "Member",
    status: "Active",
    joined: "5월 12일",
    action: "Disable",
  },
  {
    initials: "DK",
    name: "동규",
    email: "dongkyu@prompt.town",
    role: "Member",
    status: "Active",
    joined: "5월 20일",
    action: "Disable",
  },
  {
    initials: "JH",
    name: "지훈",
    email: "jihoon@prompt.town",
    role: "Member",
    status: "Disabled",
    joined: "5월 8일",
    action: "Enable",
  },
]

function DesktopMembers() {
  return (
    <>
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
            Members · 4
          </span>
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            프로젝트 멤버와 역할을 관리합니다 — 가입은 초대 링크로만 가능합니다.
          </span>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-sm bg-accent px-4 py-2"
        >
          <span className="pen-text text-[14px] tracking-[-0.22px] text-white">Create invite</span>
        </button>
      </div>
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <KeyHead w={170}>MEMBER</KeyHead>
          <span className="min-w-0 flex-1">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              EMAIL
            </span>
          </span>
          <KeyHead w={90}>ROLE</KeyHead>
          <KeyHead w={110}>STATUS</KeyHead>
          <KeyHead w={80}>JOINED</KeyHead>
          <span className="w-[60px] shrink-0" />
        </div>
        {MEMBERS.map((m, i) => (
          <div
            key={m.email}
            className={cn(
              "flex h-12 w-full items-center gap-3.5 px-[18px]",
              i < MEMBERS.length - 1 && "border-b border-hairline",
              m.status === "Disabled" && "opacity-60",
            )}
          >
            <span className="flex w-[170px] shrink-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-xl",
                  m.role === "ADMIN" ? "bg-dark-card" : "bg-input",
                )}
              >
                <span
                  className={cn(
                    "pen-text text-[8.5px] font-semibold",
                    m.role === "ADMIN" ? "text-white" : "text-ink-secondary",
                  )}
                >
                  {m.initials}
                </span>
              </span>
              <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink">
                {m.name}
              </span>
              {m.you && (
                <span className="flex items-center rounded-[4px] bg-input px-1.5 py-0.5">
                  <span className="pen-text text-[9.5px] font-semibold text-ink-tertiary">You</span>
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="pen-text text-[12.5px] tracking-[-0.12px] whitespace-nowrap text-ink-secondary">
                {m.email}
              </span>
            </span>
            <span className="flex w-[90px] shrink-0 items-center">
              {m.role === "ADMIN" ? (
                <span className="flex items-center rounded-[4px] bg-input px-[7px] py-0.5">
                  <span className="pen-text text-[9.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                    ADMIN
                  </span>
                </span>
              ) : (
                <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-secondary">
                  Member
                </span>
              )}
            </span>
            <span className="flex w-[110px] shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  "size-[7px] rounded-full",
                  m.status === "Active" ? "bg-success" : "bg-separator",
                )}
              />
              <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink-secondary">
                {m.status}
              </span>
            </span>
            <span className="w-20 shrink-0">
              <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                {m.joined}
              </span>
            </span>
            <span className="flex w-[60px] shrink-0 justify-end">
              {m.action && (
                <button
                  type="button"
                  className={cn(
                    "pen-text text-[12.5px] font-medium tracking-[-0.12px]",
                    m.action === "Disable" ? "text-danger" : "text-link",
                  )}
                >
                  {m.action}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        Disabled 멤버의 api-key는 즉시 401로 거부됩니다 · 역할은 admin / member 2종입니다.
      </span>
    </>
  )
}

type Invite = {
  token: string
  by: string
  created: string
  expires: string
  status: "Active" | "Used by 민지" | "Expired"
  dim?: boolean
}

const INVITES: Invite[] = [
  { token: "inv_8f3e…21bd", by: "수연", created: "방금", expires: "71시간 후", status: "Active" },
  {
    token: "inv_77ab…d4f2",
    by: "수연",
    created: "5월 12일",
    expires: "—",
    status: "Used by 민지",
    dim: true,
  },
  {
    token: "inv_19cc…a8e7",
    by: "수연",
    created: "5월 28일",
    expires: "만료됨",
    status: "Expired",
    dim: true,
  },
]

const INVITE_DOT: Record<Invite["status"], string> = {
  Active: "bg-success",
  "Used by 민지": "bg-separator",
  Expired: "bg-warning",
}

function DesktopInvites() {
  return (
    <>
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
            Invites
          </span>
          <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
            가입은 초대 링크로만 가능합니다 — 링크는 72시간 후 만료됩니다.
          </span>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-sm bg-accent px-4 py-2"
        >
          <span className="pen-text text-[14px] tracking-[-0.22px] text-white">
            Create invite link
          </span>
        </button>
      </div>
      <RevealBanner
        title="Invite link created"
        desc="이 링크를 팀원에게 공유하세요 — 72시간 후 또는 가입 완료 시 만료됩니다."
        value="https://specraft.prompt.town/join/inv_8f3e21bd7a4c"
      />
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
        <div className="flex h-9 w-full items-center gap-3.5 border-b border-hairline px-[18px]">
          <KeyHead w={200}>LINK</KeyHead>
          <KeyHead w={120}>CREATED BY</KeyHead>
          <KeyHead w={80}>CREATED</KeyHead>
          <KeyHead w={110}>EXPIRES</KeyHead>
          <span className="min-w-0 flex-1">
            <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
              STATUS
            </span>
          </span>
        </div>
        {INVITES.map((inv, i) => (
          <div
            key={inv.token}
            className={cn(
              "flex h-[46px] w-full items-center gap-3.5 px-[18px]",
              i < INVITES.length - 1 && "border-b border-hairline",
              inv.dim && "opacity-[0.65]",
            )}
          >
            <span className="flex w-[200px] shrink-0 items-center">
              <span className="pen-text font-mono text-[11.5px] text-ink-secondary">
                {inv.token}
              </span>
            </span>
            <span className="flex w-[120px] shrink-0 items-center gap-[7px]">
              <span className="flex size-5 items-center justify-center rounded-[10px] bg-dark-card">
                <span className="pen-text text-[8px] font-semibold text-white">SY</span>
              </span>
              <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">{inv.by}</span>
            </span>
            <span className="w-20 shrink-0">
              <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                {inv.created}
              </span>
            </span>
            <span className="w-[110px] shrink-0">
              <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
                {inv.expires}
              </span>
            </span>
            {/* 디자인은 셀이 아닌 카드 경계에서 클립 — overflow-hidden을 셀에 주지 않는다 */}
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className={cn("size-[7px] shrink-0 rounded-full", INVITE_DOT[inv.status])} />
              <span className="pen-text text-[12px] font-medium tracking-[-0.12px] whitespace-nowrap text-ink-secondary">
                {inv.status}
              </span>
            </span>
          </div>
        ))}
      </div>
      <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
        만료되거나 사용된 링크는 재사용할 수 없습니다 · 초대 생성은 admin만 가능합니다.
      </span>
    </>
  )
}

/* ───────────────────────── 모바일 ───────────────────────── */

function MobileNavRow({ title, badge }: { title: string; badge?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="flex size-[30px] shrink-0 items-center justify-center rounded-[15px] bg-input"
        aria-label="뒤로"
      >
        <ChevronLeft className="size-4 text-ink-secondary" />
      </button>
      <span className="pen-text font-display text-[21px] font-semibold tracking-[-0.32px] text-ink">
        {title}
      </span>
      {badge}
    </div>
  )
}

function MobileHub() {
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
            <span className="pen-text text-[15px] font-semibold text-white">SY</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="pen-text text-[15px] font-semibold tracking-[-0.24px] text-ink">
              수연
            </span>
            <span className="pen-text text-[11.5px] tracking-[-0.1px] text-ink-tertiary">
              senna@prompt.town
            </span>
          </div>
          <span className="flex items-center rounded-pill bg-input px-2 py-[3px]">
            <span className="pen-text text-[9.5px] font-semibold tracking-[0.4px] text-ink-secondary">
              ADMIN
            </span>
          </span>
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
          <Link to="/signin" className="flex h-[50px] w-full items-center gap-[11px] px-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-[#FF3B3014]">
              <LogOut className="size-3.5 text-danger" />
            </span>
            <span className="pen-text text-[13.5px] tracking-[-0.2px] text-danger">Sign out</span>
          </Link>
        </div>
        <div className="flex w-full justify-center py-1.5">
          <span className="pen-text text-[10.5px] tracking-[-0.1px] text-[#00000052]">
            specraft v1 · self-hosted
          </span>
        </div>
      </div>
      <MobileTabBar active="profile" />
    </>
  )
}

function InfoRow({
  label,
  value,
  dot,
  link,
  chevron,
  border = true,
}: {
  label: string
  value?: string
  dot?: "success"
  link?: boolean
  chevron?: boolean
  border?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-2 px-3.5",
        border && "border-b border-hairline",
      )}
    >
      <span
        className={cn("pen-text text-[13px] tracking-[-0.2px]", link ? "text-link" : "text-ink")}
      >
        {label}
      </span>
      <span className="h-px flex-1" />
      {dot && <span className="size-[7px] rounded-full bg-success" />}
      {value && (
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">{value}</span>
      )}
      {chevron && <ChevronRight className="size-3.5 text-separator" />}
    </div>
  )
}

function SectionLabel({ children, first }: { children: string; first?: boolean }) {
  return (
    // flex 필수 — block 안 inline span은 부모 strut(16px×1.5)로 높이가 부풀어 섹션마다 +12px 누적된다
    <div className={cn("flex w-full px-1", first ? "pt-1" : "pt-1.5")}>
      <span className="pen-text text-[10px] font-semibold tracking-[0.8px] text-ink-tertiary">
        {children}
      </span>
    </div>
  )
}

function MobileGeneral() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title="General" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <SectionLabel first>SERVER</SectionLabel>
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          <InfoRow label="Version" value="v1.0.2" />
          <InfoRow label="Status" value="Operational" dot="success" />
          <InfoRow label="Uptime" value="14 days" border={false} />
        </div>
        <SectionLabel>WIKI INTEGRITY</SectionLabel>
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          <InfoRow label="git fsck" value="Passed" dot="success" />
          <InfoRow label="Core skeleton" value="index · log · overview" dot="success" />
          <InfoRow label="Last check" value="오늘 06:00" />
          <InfoRow label="Run integrity check" link chevron border={false} />
        </div>
        <SectionLabel>STORAGE</SectionLabel>
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          <InfoRow label="wiki.git" value="42 MB" />
          <InfoRow label="specraft.db" value="8 MB" />
          <InfoRow label="Backup guide" link chevron border={false} />
        </div>
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          백업은 /data 볼륨 스냅샷을 권장합니다 — 가이드 참고
        </span>
      </div>
    </>
  )
}

function MobileGit() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title="Git integration" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <div className="flex w-full flex-col gap-[9px] rounded-md bg-surface p-3.5">
          <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
            Remote URL
          </span>
          <div className="flex h-[42px] w-full items-center overflow-hidden rounded-[10px] bg-bg px-3">
            <span className="pen-text font-mono text-[11px] whitespace-nowrap text-ink">
              git@github.com:prompt-town/specraft.git
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            <span className="pen-text text-[11px] tracking-[-0.1px] text-ink-tertiary">
              Connected · 마지막 fetch 2분 전
            </span>
          </span>
        </div>
        <div className="flex w-full flex-col gap-[9px] rounded-md bg-surface p-3.5">
          <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
            Credential
          </span>
          <div className="flex w-full gap-0.5 rounded-[9px] bg-input p-0.5">
            <span className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-[7px] bg-surface shadow-[0_1px_3px_#0000001F]">
              <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink">
                SSH deploy key
              </span>
            </span>
            <span className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-[7px]">
              <span className="pen-text text-[11.5px] font-medium tracking-[-0.1px] text-ink-tertiary">
                HTTPS PAT
              </span>
            </span>
          </div>
          <div className="flex h-[42px] w-full items-center gap-2 rounded-[10px] bg-bg px-3">
            <span className="pen-text font-mono text-[11px] text-ink">
              ssh-ed25519 ••••••••••••••
            </span>
            <span className="h-px flex-1" />
            <EyeOff className="size-3.5 text-ink-tertiary" />
          </div>
          <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
            credential은 SPECRAFT_SECRET 파생 키로 암호화 저장됩니다
          </span>
        </div>
        <div className="flex w-full gap-2">
          <button
            type="button"
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] bg-input"
          >
            <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-ink">
              Test connection
            </span>
          </button>
          <button
            type="button"
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] bg-accent"
          >
            <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-white">
              Save
            </span>
          </button>
        </div>
        <span className="pen-text text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          서버는 코드 repo에 read-only로만 접근합니다
        </span>
      </div>
    </>
  )
}

function MobileModels() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title="Models" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <div className="flex w-full flex-col gap-3 rounded-md bg-surface p-3.5">
          <div className="flex w-full flex-col gap-1.5">
            <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
              Ingest model
            </span>
            <div className="flex h-[42px] w-full items-center rounded-[10px] bg-bg px-3">
              <span className="pen-text font-mono text-[11px] text-ink">
                anthropic/claude-sonnet-4.6
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink">
              Query model
            </span>
            <div className="flex h-[42px] w-full items-center rounded-[10px] bg-bg px-3">
              <span className="pen-text font-mono text-[11px] text-ink">
                anthropic/claude-haiku-4.5
              </span>
            </div>
          </div>
          <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
            OpenRouter 슬러그 — ingest / query 분리 설정. OPENROUTER_API_KEY는 서버 env에서
            관리됩니다.
          </span>
        </div>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-[10px] bg-accent"
        >
          <span className="pen-text text-[13.5px] font-medium tracking-[-0.2px] text-white">
            Save
          </span>
        </button>
      </div>
    </>
  )
}

function MobileMembers() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow
        title="Members"
        badge={
          <span className="flex items-center rounded-pill bg-input px-2 py-[3px]">
            <span className="pen-text text-[10px] font-semibold text-ink-secondary">4</span>
          </span>
        }
      />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          {MEMBERS.map((m, i) => (
            <div
              key={m.email}
              className={cn(
                "flex h-[58px] w-full items-center gap-[11px] px-3.5",
                i < MEMBERS.length - 1 && "border-b border-hairline",
                m.status === "Disabled" && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-2xl",
                  m.role === "ADMIN" ? "bg-dark-card" : "bg-input",
                )}
              >
                <span
                  className={cn(
                    "pen-text text-[11px] font-semibold",
                    m.role === "ADMIN" ? "text-white" : "text-ink-secondary",
                  )}
                >
                  {m.initials}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="flex items-center gap-[5px]">
                  <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
                    {m.name}
                  </span>
                  {m.you && (
                    <span className="flex items-center rounded-[4px] bg-input px-[5px] py-px">
                      <span className="pen-text text-[8.5px] font-semibold text-ink-tertiary">
                        You
                      </span>
                    </span>
                  )}
                </span>
                <span className="pen-text truncate text-[11px] tracking-[-0.1px] text-ink-tertiary">
                  {m.email}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {m.role === "ADMIN" ? (
                  <span className="flex items-center rounded-[4px] bg-input px-1.5 py-0.5">
                    <span className="pen-text text-[8.5px] font-semibold tracking-[0.4px] text-ink-secondary">
                      ADMIN
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        m.status === "Active" ? "bg-success" : "bg-separator",
                      )}
                    />
                    <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-ink-secondary">
                      {m.status}
                    </span>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent"
        >
          <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
            Create invite
          </span>
        </button>
        <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
          Disabled 멤버의 api-key는 즉시 401로 거부됩니다 · 역할은 admin / member 2종
        </span>
      </div>
    </>
  )
}

const MOBILE_INVITES = [
  { token: "inv_8f3e…21bd", meta: "수연 · 방금 · 71시간 후 만료", state: "Active" as const },
  {
    token: "inv_77ab…d4f2",
    meta: "수연 · 5월 12일 · 민지 가입에 사용됨",
    state: "Used" as const,
    dim: true,
  },
  {
    token: "inv_19cc…a8e7",
    meta: "수연 · 5월 28일 · 만료됨",
    state: "Expired" as const,
    dim: true,
  },
]

const MOBILE_INVITE_DOT = { Active: "bg-success", Used: "bg-separator", Expired: "bg-warning" }

function MobileInvites() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title="Invites" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <RevealBanner
          compact
          title="Invite link created"
          desc="이 링크를 팀원에게 공유하세요 — 72시간 후 또는 가입 완료 시 만료됩니다."
          value="specraft.prompt.town/join/inv_8f3e21bd…"
        />
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          {MOBILE_INVITES.map((inv, i) => (
            <div
              key={inv.token}
              className={cn(
                "flex h-[58px] w-full items-center gap-[11px] px-3.5",
                i < MOBILE_INVITES.length - 1 && "border-b border-hairline",
                inv.dim && "opacity-[0.65]",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
                <Link2 className="size-[13px] text-ink-secondary" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="pen-text font-mono text-[11.5px] text-ink">{inv.token}</span>
                <span className="pen-text truncate text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
                  {inv.meta}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn("size-1.5 rounded-full", MOBILE_INVITE_DOT[inv.state])} />
                <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-ink-secondary">
                  {inv.state}
                </span>
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent"
        >
          <span className="pen-text text-[14.5px] font-medium tracking-[-0.22px] text-white">
            Create invite link
          </span>
        </button>
        <span className="pen-text w-full text-[10.5px] leading-[1.45] tracking-[-0.1px] text-ink-tertiary">
          만료되거나 사용된 링크는 재사용할 수 없습니다 · 초대 생성은 admin만 가능합니다
        </span>
      </div>
    </>
  )
}

function MobileKeys() {
  return (
    <>
      <MobileStatusBar />
      <MobileNavRow title="API keys" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
        <RevealBanner
          compact
          title="New key created"
          desc="이 키는 지금 한 번만 표시됩니다 — 서버에는 해시만 저장됩니다."
          value="sk-spcrft-9f3e21bd7a4c1e8f2b6d…"
        />
        <div className="flex w-full flex-col overflow-hidden rounded-md bg-surface">
          <div className="flex h-14 w-full items-center gap-[11px] border-b border-hairline px-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
              <Key className="size-[13px] text-ink-secondary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="pen-text truncate text-[13px] font-semibold tracking-[-0.2px] text-ink">
                MacBook Pro · Claude Code
              </span>
              <span className="pen-text truncate font-mono text-[10.5px] text-ink-tertiary">
                sk-spcrft-9f3e…b1d · 방금
              </span>
            </span>
            <button
              type="button"
              className="pen-text shrink-0 text-[12px] font-medium tracking-[-0.12px] text-danger"
            >
              Revoke
            </button>
          </div>
          <div className="flex h-14 w-full items-center gap-[11px] px-3.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
              <Key className="size-[13px] text-ink-secondary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="pen-text truncate text-[13px] font-semibold tracking-[-0.2px] text-ink">
                Codex CLI
              </span>
              <span className="pen-text truncate font-mono text-[10.5px] text-ink-tertiary">
                sk-spcrft-77ab…e42 · 어제
              </span>
            </span>
            <button
              type="button"
              className="pen-text shrink-0 text-[12px] font-medium tracking-[-0.12px] text-danger"
            >
              Revoke
            </button>
          </div>
        </div>
        <button
          type="button"
          className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent"
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
      </div>
    </>
  )
}
