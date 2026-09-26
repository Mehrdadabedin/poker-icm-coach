import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
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
 * The demo block (A17) holds the bundled narrated ICMBOT demo clip from
 * `frontend/public/videos/ICMBOT_demo_narrated.mp4`, served as a static asset at
 * `/videos/ICMBOT_demo_narrated.mp4`. It is a plain HTML5 player: no autoplay, no
 * loop, no external host. The clip itself is untouched and its first frame is
 * white, so `poster` paints the dark ICMBOT brand frame (the logo over the
 * clip's dark background) until the user starts playback. The 16:9 container is
 * unchanged and the narrated clip is 1920x1080, so it fills the slot exactly;
 * `.lp-video-el` uses contain, which keeps any clip's own aspect ratio instead
 * of cropping or stretching it.
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
        <p className="lp-brand" data-testid="landing-brand"><BrandLogo /></p>
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
            <h2 className="lp-section-title" id="lp-demo-title">See ICM BOT in action</h2>
            <span className="lp-section-rule" aria-hidden="true" />
            <div className="lp-video" data-testid="landing-video" data-video-slot="16:9">
              <video
                className="lp-video-el"
                data-testid="landing-video-player"
                controls
                preload="metadata"
                playsInline
                poster="/videos/ICMBOT_poster.png"
              >
                <source src="/videos/ICMBOT_demo_narrated.mp4" type="video/mp4" />
              </video>
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
