import { useState } from "react";
import { MinimalDemo, scrollToDemo } from "../landing-minimal/MinimalDemo";
import { MinimalFeatures } from "../landing-minimal/MinimalFeatures";
import { MinimalFooter } from "../landing-minimal/MinimalFooter";
import { MinimalHeader } from "../landing-minimal/MinimalHeader";
import { MinimalHero } from "../landing-minimal/MinimalHero";

/** A minimal alternative to the public landing page, served at /minimal for a
 * side-by-side comparison with the current one. It shares no component or CSS
 * with it, owns no auth state and registers no WebMCP tools: every link goes
 * to the existing sign-in flow at /login. */
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
        <MinimalFeatures />
      </main>
      <MinimalFooter />
    </div>
  );
}
