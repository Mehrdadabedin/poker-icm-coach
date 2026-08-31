import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TablePage } from "./pages/TablePage";
import { RangesPage } from "./pages/RangesPage";
import { CoachPage } from "./pages/CoachPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TrainingPage } from "./pages/TrainingPage";

/** Root router for the ICM Master application. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/table/:tableId" element={<TablePage />} />
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
