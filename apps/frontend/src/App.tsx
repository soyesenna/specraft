import { Navigate, Route, Routes } from "react-router-dom"
import { ActivityPage } from "./live/ActivityPage.js"
import { JoinInvitePage, SignInPage } from "./live/AuthPages.js"
import { SpecraftProvider } from "./live/api.js"
import { BranchProvider } from "./live/branch.js"
import { ConflictsPage } from "./live/ConflictsPage.js"
import { QueryPage } from "./live/QueryPage.js"
import { SettingsPage } from "./live/SettingsPage.js"
import { SpecsPage } from "./live/SpecsPage.js"

export function App() {
  return (
    <SpecraftProvider>
      <BranchProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/specs" replace />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/join" element={<JoinInvitePage />} />
          <Route path="/invite/:token" element={<JoinInvitePage />} />
          <Route path="/specs" element={<SpecsPage />} />
          <Route path="/specs/doc/:docId" element={<SpecsPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/settings" element={<Navigate to="/settings/git" replace />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/specs" replace />} />
        </Routes>
      </BranchProvider>
    </SpecraftProvider>
  )
}
