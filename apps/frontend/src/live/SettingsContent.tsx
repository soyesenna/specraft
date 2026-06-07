import type { AdminInvite, ApiKey, Member } from "@specraft/shared"
import { ChevronLeft, CircleCheck, Copy, EyeOff, Key, Link2, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "../lib/cn.js"

/* ───────────────────────── 공용 데이터 헬퍼 ───────────────────────── */

export type InviteStatus = "Active" | "Used" | "Expired"

export function inviteStatus(invite: AdminInvite, now: number = Date.now()): InviteStatus {
  if (invite.used_at !== null) {
    return "Used"
  }
  if (Date.parse(invite.expires_at) <= now) {
    return "Expired"
  }
  return "Active"
}

export function inviteToken(invite: AdminInvite): string {
  const token = invite.token
  if (token.length <= 13) {
    return token
  }
  return `${token.slice(0, 8)}…${token.slice(-4)}`
}

export function memberInitials(member: Pick<Member, "name" | "email">): string {
  const source = member.name.length > 0 ? member.name : member.email
  return source.slice(0, 2).toUpperCase()
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) {
    return "—"
  }
  const diff = parsed - now
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < hour) {
    const minutes = Math.max(1, Math.round(abs / minute))
    return diff >= 0 ? `${minutes}분 후` : `${minutes}분 전`
  }
  if (abs < day) {
    const hours = Math.round(abs / hour)
    return diff >= 0 ? `${hours}시간 후` : `${hours}시간 전`
  }
  const days = Math.round(abs / day)
  return diff >= 0 ? `${days}일 후` : `${days}일 전`
}

const INVITE_DOT: Record<InviteStatus, string> = {
  Active: "bg-success",
  Used: "bg-separator",
  Expired: "bg-warning",
}

/* ───────────────────────── 공용 프레젠테이션 ───────────────────────── */

export function CardHeader({
  title,
  desc,
  action,
}: {
  title: string
  desc: string
  action?: ReactNode
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="pen-text text-[16px] font-semibold tracking-[-0.26px] text-ink">
          {title}
        </span>
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">{desc}</span>
      </div>
      {action}
    </div>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 items-center justify-center rounded-sm bg-accent px-4 py-2 disabled:opacity-50"
    >
      <span className="pen-text text-[14px] tracking-[-0.22px] text-white">{children}</span>
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center rounded-sm bg-input px-4 py-2 disabled:opacity-50"
    >
      <span className="pen-text text-[14px] tracking-[-0.22px] text-ink">{children}</span>
    </button>
  )
}

export function ColumnHead({ w, children }: { w: number; children: string }) {
  return (
    <span style={{ width: w }} className="shrink-0">
      <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
        {children}
      </span>
    </span>
  )
}

export function FlexColumnHead({ children }: { children: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="pen-text text-[10.5px] font-semibold tracking-[0.6px] text-ink-tertiary">
        {children}
      </span>
    </span>
  )
}

/** 생성 직후 시크릿/링크 노출 배너 (Reveal Banner — wo0di / K0LNAg). copy 동작 포함. */
export function RevealBanner({
  title,
  desc,
  value,
  onClose,
  compact,
  subValue,
}: {
  title: string
  desc: string
  value: string
  onClose?: () => void
  compact?: boolean
  /** 보조 식별자 (예: API key id) — 별도 텍스트 노드로 노출 */
  subValue?: string
}) {
  const [copied, setCopied] = useState(false)
  function copy(): void {
    void navigator.clipboard?.writeText(value)
    setCopied(true)
  }
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
        <button type="button" onClick={onClose} aria-label="배너 닫기">
          <X className={cn("text-ink-tertiary", compact ? "size-[13px]" : "size-3.5")} />
        </button>
      </div>
      <p
        className={cn(
          "pen-text m-0 w-full leading-[1.5] text-ink-secondary",
          compact ? "text-[11.5px] tracking-[-0.1px]" : "text-[12.5px] tracking-[-0.12px]",
        )}
      >
        {desc}
      </p>
      {subValue && (
        <span className="pen-text font-mono text-[11px] text-ink-tertiary">{subValue}</span>
      )}
      <div
        className={cn(
          "flex w-full items-center overflow-hidden rounded-sm bg-dark-card",
          compact ? "gap-2 px-3 py-[9px]" : "gap-2.5 px-3.5 py-2.5",
        )}
      >
        <span
          className={cn(
            "pen-text overflow-hidden font-mono whitespace-nowrap text-white",
            compact ? "text-[10px]" : "text-[12px]",
          )}
        >
          {value}
        </span>
        <span className="h-px flex-1" />
        <button type="button" onClick={copy} aria-label={copied ? "복사됨" : "복사"}>
          <Copy
            className={cn("shrink-0 text-white-secondary", compact ? "size-[13px]" : "size-3.5")}
          />
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── 데스크톱 행 컴포넌트 ───────────────────────── */

export function KeyRow({
  apiKey,
  border,
  onRevoke,
}: {
  apiKey: ApiKey
  border?: boolean
  onRevoke: () => void
}) {
  const revoked = apiKey.revoked_at !== null
  return (
    <div
      className={cn(
        "flex h-[46px] w-full items-center gap-3.5 px-[18px]",
        border && "border-b border-hairline",
        revoked && "opacity-50",
      )}
    >
      <span className="flex w-[170px] shrink-0 items-center gap-2 overflow-hidden">
        <Key className="size-[13px] shrink-0 text-ink-tertiary" />
        <span className="pen-text truncate text-[13px] font-medium tracking-[-0.2px] text-ink">
          {apiKey.name}
        </span>
      </span>
      <span className="flex w-[190px] shrink-0 items-center">
        <span className="pen-text font-mono text-[11.5px] text-ink-secondary">{apiKey.prefix}</span>
      </span>
      <span className="w-[90px] shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {relativeTime(apiKey.created_at)}
        </span>
      </span>
      <span className="w-[90px] shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">—</span>
      </span>
      <span className="h-px flex-1" />
      <button
        type="button"
        onClick={onRevoke}
        disabled={revoked}
        className="pen-text text-[12.5px] font-medium tracking-[-0.12px] text-danger disabled:text-ink-tertiary"
      >
        {revoked ? "Revoked" : "Revoke"}
      </button>
    </div>
  )
}

export type MemberStatus = "Active" | "Disabled"

export function MemberRow({
  member,
  status,
  isYou,
  border,
  onToggle,
}: {
  member: Member
  status: MemberStatus
  isYou: boolean
  border?: boolean
  onToggle?: () => void
}) {
  const isAdmin = member.role === "admin"
  const action = isYou ? undefined : status === "Active" ? "Disable" : "Enable"
  return (
    <div
      className={cn(
        "flex h-12 w-full items-center gap-3.5 px-[18px]",
        border && "border-b border-hairline",
        status === "Disabled" && "opacity-60",
      )}
    >
      <span className="flex w-[170px] shrink-0 items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-xl",
            isAdmin ? "bg-dark-card" : "bg-input",
          )}
        >
          <span
            className={cn(
              "pen-text text-[8.5px] font-semibold",
              isAdmin ? "text-white" : "text-ink-secondary",
            )}
          >
            {memberInitials(member)}
          </span>
        </span>
        <span className="pen-text text-[13px] font-medium tracking-[-0.2px] text-ink">
          {member.name}
        </span>
        {isYou && (
          <span className="flex items-center rounded-[4px] bg-input px-1.5 py-0.5">
            <span className="pen-text text-[9.5px] font-semibold text-ink-tertiary">You</span>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] whitespace-nowrap text-ink-secondary">
          {member.email}
        </span>
      </span>
      <span className="flex w-[90px] shrink-0 items-center">
        {isAdmin ? (
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
            status === "Active" ? "bg-success" : "bg-separator",
          )}
        />
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] text-ink-secondary">
          {status}
        </span>
      </span>
      <span className="w-20 shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">—</span>
      </span>
      <span className="flex w-[60px] shrink-0 justify-end">
        {action && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "pen-text text-[12.5px] font-medium tracking-[-0.12px]",
              action === "Disable" ? "text-danger" : "text-link",
            )}
          >
            {action}
          </button>
        )}
      </span>
    </div>
  )
}

export function InviteRow({
  invite,
  border,
  now,
}: {
  invite: AdminInvite
  border?: boolean
  now?: number
}) {
  const status = inviteStatus(invite, now)
  const dim = status !== "Active"
  const createdBy = invite.used_by
  return (
    <div
      className={cn(
        "flex h-[46px] w-full items-center gap-3.5 px-[18px]",
        border && "border-b border-hairline",
        dim && "opacity-[0.65]",
      )}
    >
      <span className="flex w-[200px] shrink-0 items-center">
        <span className="pen-text font-mono text-[11.5px] text-ink-secondary">
          {inviteToken(invite)}
        </span>
      </span>
      <span className="flex w-[120px] shrink-0 items-center gap-[7px]">
        {createdBy ? (
          <>
            <span className="flex size-5 items-center justify-center rounded-[10px] bg-dark-card">
              <span className="pen-text text-[8px] font-semibold text-white">
                {memberInitials(createdBy)}
              </span>
            </span>
            <span className="pen-text text-[13px] tracking-[-0.2px] text-ink">
              {createdBy.name}
            </span>
          </>
        ) : (
          <span className="pen-text text-[13px] tracking-[-0.2px] text-ink-tertiary">—</span>
        )}
      </span>
      <span className="w-20 shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">—</span>
      </span>
      <span className="w-[110px] shrink-0">
        <span className="pen-text text-[12.5px] tracking-[-0.12px] text-ink-tertiary">
          {status === "Used" ? "—" : relativeTime(invite.expires_at, now)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={cn("size-[7px] shrink-0 rounded-full", INVITE_DOT[status])} />
        <span className="pen-text text-[12px] font-medium tracking-[-0.12px] whitespace-nowrap text-ink-secondary">
          {status}
        </span>
      </span>
    </div>
  )
}

/* ───────────────────────── 모바일 행 컴포넌트 ───────────────────────── */

export function MobileMemberRow({
  member,
  status,
  isYou,
  border,
}: {
  member: Member
  status: MemberStatus
  isYou: boolean
  border?: boolean
}) {
  const isAdmin = member.role === "admin"
  return (
    <div
      className={cn(
        "flex h-[58px] w-full items-center gap-[11px] px-3.5",
        border && "border-b border-hairline",
        status === "Disabled" && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-2xl",
          isAdmin ? "bg-dark-card" : "bg-input",
        )}
      >
        <span
          className={cn(
            "pen-text text-[11px] font-semibold",
            isAdmin ? "text-white" : "text-ink-secondary",
          )}
        >
          {memberInitials(member)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="flex items-center gap-[5px]">
          <span className="pen-text text-[13.5px] font-semibold tracking-[-0.2px] text-ink">
            {member.name}
          </span>
          {isYou && (
            <span className="flex items-center rounded-[4px] bg-input px-[5px] py-px">
              <span className="pen-text text-[8.5px] font-semibold text-ink-tertiary">You</span>
            </span>
          )}
        </span>
        <span className="pen-text truncate text-[11px] tracking-[-0.1px] text-ink-tertiary">
          {member.email}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {isAdmin ? (
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
                status === "Active" ? "bg-success" : "bg-separator",
              )}
            />
            <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-ink-secondary">
              {status}
            </span>
          </span>
        )}
      </span>
    </div>
  )
}

const MOBILE_INVITE_DOT: Record<InviteStatus, string> = {
  Active: "bg-success",
  Used: "bg-separator",
  Expired: "bg-warning",
}

export function MobileInviteRow({
  invite,
  border,
  now,
}: {
  invite: AdminInvite
  border?: boolean
  now?: number
}) {
  const status = inviteStatus(invite, now)
  const dim = status !== "Active"
  const by = invite.used_by?.name ?? "—"
  const meta =
    status === "Used"
      ? `${by} · ${invite.used_by ? `${invite.used_by.name} 가입에 사용됨` : "사용됨"}`
      : status === "Expired"
        ? `${by} · 만료됨`
        : `${by} · ${relativeTime(invite.expires_at, now)} 만료`
  return (
    <div
      className={cn(
        "flex h-[58px] w-full items-center gap-[11px] px-3.5",
        border && "border-b border-hairline",
        dim && "opacity-[0.65]",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
        <Link2 className="size-[13px] text-ink-secondary" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="pen-text font-mono text-[11.5px] text-ink">{inviteToken(invite)}</span>
        <span className="pen-text truncate text-[10.5px] tracking-[-0.1px] text-ink-tertiary">
          {meta}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className={cn("size-1.5 rounded-full", MOBILE_INVITE_DOT[status])} />
        <span className="pen-text text-[10.5px] font-medium tracking-[-0.1px] text-ink-secondary">
          {status}
        </span>
      </span>
    </div>
  )
}

export function MobileKeyRow({
  apiKey,
  border,
  onRevoke,
}: {
  apiKey: ApiKey
  border?: boolean
  onRevoke: () => void
}) {
  const revoked = apiKey.revoked_at !== null
  return (
    <div
      className={cn(
        "flex h-14 w-full items-center gap-[11px] px-3.5",
        border && "border-b border-hairline",
        revoked && "opacity-50",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-input">
        <Key className="size-[13px] text-ink-secondary" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="pen-text truncate text-[13px] font-semibold tracking-[-0.2px] text-ink">
          {apiKey.name}
        </span>
        <span className="pen-text truncate font-mono text-[10.5px] text-ink-tertiary">
          {apiKey.prefix} · {relativeTime(apiKey.created_at)}
        </span>
      </span>
      <button
        type="button"
        onClick={onRevoke}
        disabled={revoked}
        className="pen-text shrink-0 text-[12px] font-medium tracking-[-0.12px] text-danger disabled:text-ink-tertiary"
      >
        {revoked ? "Revoked" : "Revoke"}
      </button>
    </div>
  )
}

export function MobileNavRow({
  title,
  onBack,
  badge,
}: {
  title: string
  onBack: () => void
  badge?: ReactNode
}) {
  return (
    <div className="flex w-full items-center gap-2.5 px-4 pt-1.5 pb-2.5">
      <button
        type="button"
        onClick={onBack}
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

export function EyeOffIcon() {
  return <EyeOff className="size-3.5 text-ink-tertiary" />
}
