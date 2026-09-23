import { Link } from "react-router-dom";
import { Copyright } from "../components/Copyright";

/**
 * A16 - public ICM MASTER landing page.
 *
 * The public entry screen: it introduces the product and links into the
 * EXISTING authentication flow. It owns no auth state, no API call, no auth UI
 * and no game logic: LOGIN, SIGN UP and START TRAINING all open the existing
 * sign-in screen at /login, where the login page's own "Sign up" link switches
 * to registration. The sign-in component, the poker table and the app menu are
 * untouched.
 *
 * The demo block is a 16:9 placeholder: drop a real clip in by replacing the
 * <div className="lp-video-placeholder"> with
 * <video className="lp-video-el" src="..." controls preload="metadata" />.
 */

const FEATURES = [
  { title: "PLAY", text: "Practice realistic tournament poker situations." },
  { title: "REVIEW", text: "Review your hands and understand the decisions." },
  { title: "IMPROVE", text: "Build stronger tournament decision-making through practice." },
];

// "WATCH HOW IT WORKS" is an in-page jump to the demo block: no new route and
// no external service.
function watchDemo() {
  document.getElementById("lp-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingPage() {
  return (
    <div className="page landing-page" data-testid="landing-page">
      <header className="lp-header">
        <p className="lp-brand" data-testid="landing-brand">ICM MASTER</p>
        <nav className="lp-nav" aria-label="Account">
          <Link className="lp-btn lp-nav-btn lp-btn-ghost" to="/login" data-testid="landing-login">
            LOGIN
          </Link>
          <Link
            className="lp-btn lp-nav-btn lp-btn-primary"
            to="/login"
            data-testid="landing-signup"
          >
            SIGN UP
          </Link>
        </nav>
      </header>

      <main className="lp-main">
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <h1 className="lp-hero-title" id="lp-hero-title">Master your tournament decisions</h1>
          <span className="lp-hero-rule" aria-hidden="true" />
          <p className="lp-hero-text">
            Train with realistic poker situations. Understand ICM. Make better decisions.
          </p>
          <div className="lp-cta-row">
            <Link
              className="lp-btn lp-btn-primary"
              to="/login"
              data-testid="landing-start-training"
            >
              START TRAINING
            </Link>
            <button
              type="button"
              className="lp-btn lp-btn-ghost"
              onClick={watchDemo}
              data-testid="landing-watch-demo"
            >
              <span aria-hidden="true">▶</span> WATCH HOW IT WORKS
            </button>
          </div>
        </section>

        <section className="lp-section" id="lp-demo" aria-labelledby="lp-demo-title" data-testid="landing-demo">
          <div className="lp-inner">
            <h2 className="lp-section-title" id="lp-demo-title">See ICM Master in action</h2>
            <span className="lp-section-rule" aria-hidden="true" />
            <div className="lp-video" data-testid="landing-video" data-video-slot="16:9">
              <div className="lp-video-placeholder">
                <span className="lp-play" aria-hidden="true">▶</span>
                <span className="lp-video-label">ICM Master demo</span>
                <span className="lp-video-note">16:9 demonstration clip - coming soon</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-features-title" data-testid="landing-features">
          <div className="lp-inner">
            <h2 className="lp-section-title" id="lp-features-title">Play • Review • Improve</h2>
            <span className="lp-section-rule" aria-hidden="true" />
            <ul className="lp-features">
              {FEATURES.map((feature) => (
                <li className="lp-feature" key={feature.title}>
                  <h3 className="lp-feature-title">{feature.title}</h3>
                  <p className="lp-feature-text">{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-final" aria-labelledby="lp-final-title" data-testid="landing-final-cta">
          <h2 className="lp-final-title" id="lp-final-title">
            Ready to improve your tournament game?
          </h2>
          <Link className="lp-btn lp-btn-primary" to="/login" data-testid="landing-final-start">
            START TRAINING
          </Link>
        </section>
      </main>

      <div className="lp-footer">
        <p className="lp-tagline">PRACTICE • IMPROVE • WIN</p>
        <Copyright />
      </div>
    </div>
  );
}
