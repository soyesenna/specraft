import type { AdminSettingsViewResponse, ApiKey } from "@specraft/shared"
import { Copy, Key, Link2, UserPlus, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useSpecraft } from "./api.js"

export function GeneralPanel() {
  return (
    <section className="flex max-w-[760px] flex-col gap-2 rounded-lg bg-surface p-6">
      <span className="pen-text text-[16px] font-semibold">General</span>
      <span className="pen-text text-[13px] text-ink-tertiary">
        Workspace defaults are managed by the active specraft server.
      </span>
    </section>
  )
}

export function KeysPanel() {
  const { client } = useSpecraft()
  const [keys, setKeys] = useState<readonly ApiKey[]>([])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client.listApiKeys().then((response) => {
      if (active) {
        setKeys(response.keys)
      }
    })
    return () => {
      active = false
    }
  }, [client])

  async function createKey(): Promise<void> {
    const response = await client.createApiKey({ name: "frontend" })
    setCreatedKey(response.api_key)
    setCreatedId(response.id)
    const listed = await client.listApiKeys()
    setKeys(listed.keys)
  }

  return (
    <section className="flex max-w-[760px] flex-col gap-4 rounded-lg bg-surface p-6">
      <div className="flex items-center gap-2">
        <Key className="size-4" />
        <span className="pen-text text-[16px] font-semibold">API keys</span>
        <span className="h-px flex-1" />
        <button type="button" onClick={createKey} className="rounded-sm bg-accent px-4 py-2">
          <span className="pen-text text-[14px] text-white">Create API key</span>
        </button>
      </div>
      {createdKey && (
        <div className="flex flex-col gap-1 rounded-sm bg-bg p-3">
          <span className="pen-text text-[12px] text-ink-tertiary">One-time key</span>
          <span className="pen-text font-mono text-[13px] text-ink">{createdKey}</span>
          {createdId && <span className="pen-text font-mono text-[11px]">{createdId}</span>}
        </div>
      )}
      {keys.map((key) => (
        <div key={key.id} className="flex items-center gap-3 border-t border-hairline pt-3">
          <Copy className="size-3.5 text-ink-tertiary" />
          <span className="pen-text font-mono text-[12px]">{key.prefix}</span>
          <span className="pen-text text-[13px]">{key.name}</span>
          <span className="h-px flex-1" />
          <span className="pen-text font-mono text-[11px] text-ink-tertiary">{key.id}</span>
        </div>
      ))}
    </section>
  )
}

export function GitSettingsPanel() {
  const { client } = useSpecraft()
  const [settings, setSettings] = useState<AdminSettingsViewResponse | null>(null)
  const [remoteUrl, setRemoteUrl] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    void client.getAdminSettings().then((response) => {
      if (active) {
        setSettings(response)
        setRemoteUrl(response.git_remote_url ?? "")
      }
    })
    return () => {
      active = false
    }
  }, [client])

  async function save(): Promise<void> {
    await client.updateAdminSettings({ git_remote_url: remoteUrl })
    setSaved(true)
  }

  return (
    <section className="flex max-w-[760px] flex-col gap-4 rounded-lg bg-surface p-6">
      <div className="flex items-center gap-2">
        <Link2 className="size-4" />
        <span className="pen-text text-[16px] font-semibold">Git integration</span>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="pen-text text-[12.5px] font-medium">Remote URL</span>
        <input
          value={remoteUrl}
          onChange={(event) => setRemoteUrl(event.currentTarget.value)}
          className="pen-text h-10 rounded-sm border-none bg-bg px-3 font-mono text-[12.5px] outline-none"
        />
      </label>
      <span className="pen-text text-[12px] text-ink-tertiary">
        Credential configured: {settings?.credential_configured ? "yes" : "no"}
      </span>
      <button type="button" onClick={save} className="w-fit rounded-sm bg-accent px-4 py-2">
        <span className="pen-text text-[14px] text-white">Save settings</span>
      </button>
      {saved && <span className="pen-text text-[13px] text-success">Settings saved from API</span>}
    </section>
  )
}

export function InvitesPanel() {
  const { client } = useSpecraft()
  const [invites, setInvites] = useState<readonly string[]>([])

  useEffect(() => {
    let active = true
    void client.listAdminInvites().then((response) => {
      if (active) {
        setInvites(response.invites.map((invite) => invite.token))
      }
    })
    return () => {
      active = false
    }
  }, [client])

  async function createInvite(): Promise<void> {
    const response = await client.createAdminInvite()
    setInvites((current) => [response.invite_url, ...current])
  }

  return (
    <section className="flex max-w-[760px] flex-col gap-4 rounded-lg bg-surface p-6">
      <button
        type="button"
        onClick={createInvite}
        className="flex w-fit gap-2 rounded-sm bg-accent px-4 py-2"
      >
        <UserPlus className="size-4 text-white" />
        <span className="pen-text text-[14px] text-white">Create invite</span>
      </button>
      {invites.map((invite) => (
        <span key={invite} className="pen-text font-mono text-[12px]">
          {invite}
        </span>
      ))}
    </section>
  )
}

export function MembersPanel() {
  const { client } = useSpecraft()
  const [members, setMembers] = useState<readonly string[]>([])

  useEffect(() => {
    let active = true
    void client.listAdminMembers().then((response) => {
      if (active) {
        setMembers(response.members.map((member) => member.email))
      }
    })
    return () => {
      active = false
    }
  }, [client])

  return (
    <section className="flex max-w-[760px] flex-col gap-3 rounded-lg bg-surface p-6">
      <span className="flex items-center gap-2">
        <Users className="size-4" />
        <span className="pen-text text-[16px] font-semibold">Members</span>
      </span>
      {members.map((member) => (
        <span key={member} className="pen-text text-[13px]">
          {member}
        </span>
      ))}
    </section>
  )
}
