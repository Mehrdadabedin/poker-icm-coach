import { Link } from "react-router-dom";

/** A47 hero: two columns. Left copy with the real H1 and two actions; right
 * the cropped robot artwork (hero-robot.webp) whose left edge fades into the
 * section background. The old invisible hit areas are gone: the buttons here
 * are real. */
export function LandingHero() {
  return (
    <section className="lp-hero lp-band" id="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero-copy">
        <p className="lp-kicker">TOURNAMENT POKER TRAINER</p>
        <h1 className="lp-hero-title" id="lp-hero-title">
          MASTER YOUR TOURNAMENT DECISIONS
        </h1>
        <p className="lp-hero-sub">
          Play 9-handed tournaments against 8 bots. Before every decision, the
          ICM coach tells you what to do and why.
        </p>
        <div className="lp-hero-actions">
          <Link className="lp-btn lp-btn-gold" to="/login" data-testid="landing-start-training">
            START TRAINING FREE
          </Link>
          <button
            type="button"
            className="lp-btn lp-btn-outline"
            onClick={() => {
              document.getElementById("lp-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            data-testid="landing-watch-demo"
          >
            WATCH DEMO
          </button>
        </div>
        <p className="lp-hero-legal">Practice only, no real money · Plays in your browser and on Android</p>
      </div>
      <div className="lp-hero-visual">
        <img
          className="lp-hero-img"
          src="/images/hero-robot.webp"
          alt="ICMBOT robot at the tournament table, emerging from the dark"
          data-testid="landing-hero-visual"
        />
      </div>
    </section>
  );
}
