import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { getToken } from "./services/api";
import { TablePage } from "./pages/TablePage";
import { RangesPage } from "./pages/RangesPage";
import { CoachPage } from "./pages/CoachPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TrainingPage } from "./pages/TrainingPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";

/** Public entry screen (A16): a visitor without a session gets the new landing
 * page; a signed-in user keeps the existing home screen, so HOME, the app menu
 * and every existing deep link behave exactly as before. The sign-in screen
 * itself is the existing HomePage and lives at /login. */
function EntryPage() {
  return getToken() ? <HomePage /> : <LandingPage />;
}

/** Root router for the ICM Master application. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/login" element={<HomePage />} />
        <Route path="/table/:tableId" element={<TablePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/ranges" element={<RangesPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
      </Routes>
    </HashRouter>
  );
}
