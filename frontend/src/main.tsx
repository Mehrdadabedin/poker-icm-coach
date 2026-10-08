import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initializeGoogleAnalytics } from "./analytics";
import "./styles/base.css";
import "./styles/app-header.css";
import "./styles/seats.css";
import "./styles/felt.css";
import "./styles/placement.css";
import "./styles/controls.css";
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
import "./styles/landing.css";
import "./styles/landing-sections.css";
import "./styles/landing-hero.css";
import "./styles/landing-quiz.css";
import "./styles/landing-coach.css";
import "./styles/landing-faq.css";
import "./styles/brand.css";
import "./styles/mobile.css";
import "./styles/analytics-consent.css";
import "./styles/admin.css";
import "./styles/admin-moderation.css";
import "./styles/bot-profiles.css";
import "./styles/winloss.css";
import "./styles/winner.css";

initializeGoogleAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
