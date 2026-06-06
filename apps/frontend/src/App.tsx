import { Navigate, Route, Routes } from "react-router-dom"
import { ActivityScreen } from "./screens/ActivityScreen.js"
import { ConflictsScreen } from "./screens/ConflictsScreen.js"
import { DocumentHistoryScreen } from "./screens/DocumentHistoryScreen.js"
import { DocumentScreen } from "./screens/DocumentScreen.js"
import { JoinInviteScreen } from "./screens/JoinInviteScreen.js"
import { QueryScreen } from "./screens/QueryScreen.js"
import { SettingsScreen } from "./screens/SettingsScreen.js"
import { SignInScreen } from "./screens/SignInScreen.js"
import { SpecsScreen } from "./screens/SpecsScreen.js"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/specs" replace />} />
      <Route path="/signin" element={<SignInScreen />} />
      <Route path="/join" element={<JoinInviteScreen />} />
      <Route path="/specs" element={<SpecsScreen />} />
      <Route path="/specs/doc/:docId" element={<DocumentScreen />} />
      <Route path="/specs/doc/:docId/history" element={<DocumentHistoryScreen />} />
      <Route path="/query" element={<QueryScreen />} />
      <Route path="/activity" element={<ActivityScreen />} />
      <Route path="/conflicts" element={<ConflictsScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/settings/:section" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/specs" replace />} />
    </Routes>
  )
}
