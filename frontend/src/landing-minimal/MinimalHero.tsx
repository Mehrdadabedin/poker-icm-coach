import { Link } from "react-router-dom";
import { MinimalProductShot } from "./MinimalProductShot";

interface MinimalHeroProps {
  demoOpen: boolean;
  onWatchDemo: () => void;
}

/** Hero of the minimal landing: a very large headline, one sentence, ONE
 * primary button and a quiet text link that opens the demo video, then the
 * real product in a browser frame. */
export function MinimalHero({ demoOpen, onWatchDemo }: MinimalHeroProps) {
  return (
    <section className="lm-hero" aria-labelledby="lm-hero-title" data-testid="minimal-hero">
      <h1 className="lm-title" id="lm-hero-title">
        Master tournament <span className="lm-accent">decisions.</span>
      </h1>
      <p className="lm-sub">
        Play 9-handed tournaments against 8 bots. The ICM coach shows the right
        move, and why.
      </p>
      <div className="lm-actions">
        <Link className="lm-btn lm-btn-primary" to="/login" data-testid="minimal-start">
          Start training free
        </Link>
        <button
          type="button"
          className="lm-link"
          aria-expanded={demoOpen}
          onClick={onWatchDemo}
          data-testid="minimal-watch-demo"
        >
          Watch the demo
        </button>
      </div>
      <p className="lm-note" data-testid="minimal-note">Practice only. No real money. Browser and Android.</p>
      <MinimalProductShot />
    </section>
  );
}
