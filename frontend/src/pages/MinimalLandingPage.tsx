import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLandingWebMcp } from "../landing/useLandingWebMcp";
import { MinimalClosing } from "../landing-minimal/MinimalClosing";
import { MinimalDemo, scrollToDemo } from "../landing-minimal/MinimalDemo";
import { MinimalFeatures } from "../landing-minimal/MinimalFeatures";
import { MinimalFooter } from "../landing-minimal/MinimalFooter";
import { MinimalHeader } from "../landing-minimal/MinimalHeader";
import { MinimalHero } from "../landing-minimal/MinimalHero";
import { MinimalHow } from "../landing-minimal/MinimalHow";

/** The landing page at / (plan 069): one message, one action, one picture,
 * then How it works in three steps, three features and the same action again.
 * It owns no auth state; every link goes to the sign-in flow at /login. The
 * landing WebMCP tools (watch_demo, start_training, explain_icm) moved here
 * from the old page, which stays at /classic for now. */
export function MinimalLandingPage() {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const watchDemo = () => {
    if (demoOpen) scrollToDemo();
    else setDemoOpen(true);
  };

  useLandingWebMcp({ watchDemo, startTraining: () => navigate("/login"), demoTarget: "lm-demo" });

  return (
    <div className="lm-page" data-testid="minimal-landing-page">
      <MinimalHeader />
      <main className="lm-main">
        <MinimalHero demoOpen={demoOpen} onWatchDemo={watchDemo} />
        {demoOpen && <MinimalDemo />}
        <MinimalHow />
        <MinimalFeatures />
        <MinimalClosing />
      </main>
      <MinimalFooter />
    </div>
  );
}
