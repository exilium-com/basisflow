import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { WorkspaceProfileShell } from "./pages/WorkspaceProfileShell";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/workspace" element={<WorkspaceProfileShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
