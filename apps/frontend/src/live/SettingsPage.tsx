import { ChevronLeft } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { SettingsNav, type SettingsSection } from "../components/SettingsNav.js"
import { LiveShell } from "./LiveShell.js"
import { ModelsPanel } from "./SettingsModelPanel.js"
import {
  GeneralPanel,
  GitSettingsPanel,
  InvitesPanel,
  KeysPanel,
  MembersPanel,
} from "./SettingsPanels.js"

function sectionFromParam(section: string | undefined): SettingsSection {
  if (
    section === "general" ||
    section === "git" ||
    section === "models" ||
    section === "invites" ||
    section === "keys" ||
    section === "members"
  ) {
    return section
  }
  return "git"
}

export function SettingsPage() {
  const navigate = useNavigate()
  const params = useParams<{ section?: string }>()
  const section = sectionFromParam(params.section)
  return (
    <LiveShell
      title="Settings"
      showSidebar={false}
      titlePrefix={
        <button
          type="button"
          aria-label="Specs로 돌아가기"
          onClick={() => navigate("/specs")}
          className="flex size-9 items-center justify-center rounded-[18px] bg-input text-ink-secondary"
        >
          <ChevronLeft className="size-4" />
        </button>
      }
      titleMeta={
        <span className="flex items-center rounded-pill bg-input px-[9px] py-[3px]">
          <span className="pen-text text-[10.5px] font-semibold tracking-[0.4px] text-ink-secondary">
            ADMIN
          </span>
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 gap-[26px] px-7 pb-7">
        <SettingsNav active={section} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {section === "general" && <GeneralPanel />}
          {section === "keys" && <KeysPanel />}
          {section === "git" && <GitSettingsPanel />}
          {section === "models" && <ModelsPanel />}
          {section === "invites" && <InvitesPanel />}
          {section === "members" && <MembersPanel />}
        </div>
      </div>
    </LiveShell>
  )
}
