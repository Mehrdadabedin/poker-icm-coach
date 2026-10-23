import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AdminChangePasswordPage } from "./pages/AdminChangePasswordPage";
import { AdminPage } from "./pages/AdminPage";
import { AppLinkListener } from "./components/AppLinkListener";
import { I18nProvider } from "./i18n/I18n";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MinimalLandingPage } from "./pages/MinimalLandingPage";
import { getToken } from "./services/api";
import { inAndroidApp } from "./services/platform";
import { TablePage } from "./pages/TablePage";
import { RangesPage } from "./pages/RangesPage";
import { CoachPage } from "./pages/CoachPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { HistoryPage } from "./pages/HistoryPage";
import { ReportPage } from "./pages/ReportPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { MistakesPage } from "./pages/MistakesPage";
import { IcmCalculatorPage } from "./pages/IcmCalculatorPage";
import { TrainingPage } from "./pages/TrainingPage";
import { BotProfilesPage } from "./pages/BotProfilesPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { trackPageView } from "./analytics";
import { AnalyticsConsentBanner } from "./components/AnalyticsConsentBanner";

/** Public entry screen (A16): a visitor without a session gets the minimal
 * landing page (plan 069); a signed-in user keeps the home menu, so HOME and
 * every existing deep link behave exactly as before. The sign-in screen is the
 * existing HomePage at /login. The Android app skips the landing page and
 * opens on sign-in (plan 085). */
function EntryPage() {
  return getToken() || inAndroidApp() ? <HomePage /> : <MinimalLandingPage />;
}

function AnalyticsPageView() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

/** Root router for the ICM Master application. */
export function App() {
  return (
    <I18nProvider>
      <HashRouter>
        <AnalyticsPageView />
        <AnalyticsConsentBanner />
        <AppLinkListener />
        <Routes>
          <Route path="/" element={<EntryPage />} />
          {/* plan 069: the old landing page stays at /classic for a while to
              compare; links shared to /minimal open the landing page at / */}
          <Route path="/classic" element={<LandingPage />} />
          <Route path="/minimal" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/change-password" element={<AdminChangePasswordPage />} />
          <Route path="/admin/:section?" element={<AdminPage />} />
          <Route path="/table/:tableId" element={<TablePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/bot-profiles" element={<BotProfilesPage />} />
          {/* the random-opponents step is gone: old /start links pick the 8 bots */}
          <Route path="/start" element={<Navigate to="/bot-profiles" replace />} />
          <Route path="/ranges" element={<RangesPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* plan 095: the portrait is part of the profile page */}
          <Route path="/portrait" element={<Navigate to="/profile" replace />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/icm-calculator" element={<IcmCalculatorPage />} />
        </Routes>
      </HashRouter>
    </I18nProvider>
  );
}
