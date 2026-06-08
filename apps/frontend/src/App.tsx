import { Navigate, Route, Routes } from "react-router-dom"
import { ActivityPage } from "./live/ActivityPage.js"
import { SpecraftProvider } from "./live/api.js"
import { BranchProvider } from "./live/branch.js"
import { ConflictsPage } from "./live/ConflictsPage.js"
import { DocumentHistoryPage } from "./live/DocumentHistoryPage.js"
import { DocumentPage } from "./live/DocumentPage.js"
import { IngestDetailPage } from "./live/IngestDetailPage.js"
import { QueryDetailPage } from "./live/QueryDetailPage.js"
import { QueryPage } from "./live/QueryPage.js"
import { SettingsPage } from "./live/SettingsPage.js"
import { SpecsPage } from "./live/SpecsPage.js"
import { AdminSetupScreen } from "./screens/AdminSetupScreen.js"
import { JoinInviteScreen } from "./screens/JoinInviteScreen.js"
import { SignInScreen } from "./screens/SignInScreen.js"

export function App() {
  return (
    <SpecraftProvider>
      <BranchProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/specs" replace />} />
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/setup" element={<AdminSetupScreen />} />
          <Route path="/join" element={<JoinInviteScreen />} />
          <Route path="/invite/:token" element={<JoinInviteScreen />} />
          <Route path="/specs" element={<SpecsPage />} />
          <Route path="/specs/doc/:docId" element={<DocumentPage />} />
          <Route path="/specs/doc/:docId/history" element={<DocumentHistoryPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/activity/ingest/:id" element={<IngestDetailPage />} />
          <Route path="/activity/query/:id" element={<QueryDetailPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/specs" replace />} />
        </Routes>
      </BranchProvider>
    </SpecraftProvider>
  )
}
