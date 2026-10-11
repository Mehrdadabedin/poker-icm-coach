import { useState } from "react";
import { MinimalClosing } from "../landing-minimal/MinimalClosing";
import { MinimalDemo, scrollToDemo } from "../landing-minimal/MinimalDemo";
import { MinimalFeatures } from "../landing-minimal/MinimalFeatures";
import { MinimalFooter } from "../landing-minimal/MinimalFooter";
import { MinimalHeader } from "../landing-minimal/MinimalHeader";
import { MinimalHero } from "../landing-minimal/MinimalHero";
import { MinimalHow } from "../landing-minimal/MinimalHow";

/** The minimalist brand landing page, served at /minimal for a side-by-side
 * comparison with the current one: one message, one action, one picture, then
 * How it works in three steps, three features and the same action again.
 * It shares no component or CSS with the current page, owns no auth state and
 * registers no WebMCP tools: every link goes to the sign-in flow at /login. */
export function MinimalLandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  const watchDemo = () => {
    if (demoOpen) scrollToDemo();
    else setDemoOpen(true);
  };

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
