import { useEffect, useState } from "react";
import { getAuthProviders, type AuthProviders } from "../services/api";
import { useLandingWebMcp } from "../landing/useLandingWebMcp";
import { LandingHeader } from "../landing/LandingHeader";
import { LandingHero } from "../landing/LandingHero";
import { LandingDemo } from "../landing/LandingDemo";
import { LandingQuiz } from "../landing/LandingQuiz";
import { LandingCoach } from "../landing/LandingCoach";
import { LandingHow } from "../landing/LandingHow";
import { LandingOpponents } from "../landing/LandingOpponents";
import { LandingPerks } from "../landing/LandingPerks";
import { LandingFaq } from "../landing/LandingFaq";
import { LandingFinalCta } from "../landing/LandingFinalCta";

/** A47 — ICMBOT public landing page: one scrollable page of split sections.
 * It owns no auth state and no game logic; every action either scrolls inside
 * the page or opens the existing sign-in flow at /login. The landing-only
 * WebMCP tools (watch_demo / start_training / explain_icm) are registered by
 * useLandingWebMcp and exist nowhere else in the app. */
function scrollToDemo() {
  document.getElementById("lp-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingPage() {
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    getAuthProviders()
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  useLandingWebMcp({
    watchDemo: scrollToDemo,
    startTraining: () => {
      window.location.hash = "#/login";
    },
  });

  return (
    <div className="page landing-page" data-testid="landing-page">
      <LandingHeader />
      <main className="lp-main">
        <LandingHero />
        <LandingDemo />
        <LandingQuiz />
        <LandingCoach />
        <LandingHow />
        <LandingOpponents />
        <LandingPerks />
        <LandingFaq />
      </main>
      <LandingFinalCta googleAvailable={providers?.google === true} />
    </div>
  );
}
