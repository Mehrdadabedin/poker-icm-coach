import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initializeGoogleAnalytics } from "./analytics";
import { initTheme } from "./services/theme";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app-header.css";
import "./styles/seats.css";
import "./styles/felt.css";
import "./styles/placement.css";
import "./styles/controls.css";
import "./styles/bet-sizer.css";
import "./styles/coach-mobile.css";
import "./styles/pages.css";
import "./styles/coach-panel.css";
import "./styles/review.css";
import "./styles/explanations.css";
import "./styles/coach-analyzer.css";
import "./styles/cards.css";
import "./styles/auth.css";
import "./styles/auth-providers.css";
import "./styles/auth-form.css";
import "./styles/auth-footer.css";
import "./styles/landing-minimal.css";
import "./styles/landing-minimal-sections.css";
import "./styles/landing-minimal-cards.css";
import "./styles/brand.css";
import "./styles/mobile.css";
import "./styles/table-menu.css";
import "./styles/table-landscape.css";
import "./styles/table-phone.css";
import "./styles/table-drawer.css";
import "./styles/table-desktop.css";
import "./styles/table-history.css";
import "./styles/analytics-consent.css";
import "./styles/admin.css";
import "./styles/admin-moderation.css";
import "./styles/bot-profiles.css";
import "./styles/winloss.css";
import "./styles/winner.css";
import "./styles/final-standings.css";
import "./styles/glossary.css";
import "./styles/mistakes.css";
import "./styles/icm-calculator.css";
import "./styles/page-header.css";
import "./styles/home-menu.css";
import "./styles/tab-bar.css";
import "./styles/appearance.css";
import "./styles/report.css";
import "./styles/lang-menu.css";
import "./styles/portrait.css";
import "./styles/profile.css";
import "./styles/plans.css";
import "./styles/leaderboard.css";

initTheme();
initializeGoogleAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
