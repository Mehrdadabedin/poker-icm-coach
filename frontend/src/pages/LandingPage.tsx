import { useRef, useState } from "react";
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
 * The demo block (A17) holds the bundled narrated BOT PROFILES demo clip
 * (`frontend/public/videos/ICM_BOT_demo_bot_profiles_narrated.mp4`, served at
 * `/videos/ICM_BOT_demo_bot_profiles_narrated.mp4`). It is a plain HTML5
 * player: no autoplay, no loop, no external host. The clip opens with the
 * ICMBOT poster frame, and a poster overlay shows the same artwork before
 * first play, on pause (without seeking), and after the clip ends, so the
 * brand frame stays visible whenever playback is not running. The 16:9
 * container and `.lp-video-el` contain sizing are unchanged.
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showPoster, setShowPoster] = useState(true);

  // Poster overlay: visible before first play, on pause (position preserved),
  // and after the clip ends. Clicking it starts or resumes playback; the
  // native controls stay reachable below it.
  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setShowPoster(false);
    const started = video.play();
    if (started && typeof started.catch === "function") {
      started.catch(() => setShowPoster(true));
    }
  };

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
          {/* The target artwork IS the hero: one complete image (only the hero
              band was extracted from docs/design/ICMBOT_landing_target.png,
              header and "SEE ICM BOT IN ACTION" excluded). The visible copy and
              buttons live inside the artwork. This HTML adds only the
              interaction layer: an accessible copy mirror and two invisible
              hit areas over the artwork's buttons. */}
          <div className="lp-hero-figure" data-testid="landing-hero-visual">
            <img className="lp-hero-img" src="/images/ICMBOT_target_hero.png" alt="" />
            {/* Hit areas live inside the figure so they stay aligned with the
                artwork's buttons at any rendered image size. Invisible. */}
            <Link
              className="lp-hero-hit lp-start-hit"
              to="/login"
              aria-label="Start Training"
              data-testid="landing-start-training"
            />
            <button
              type="button"
              className="lp-hero-hit lp-watch-hit"
              aria-label="Watch How It Works"
              onClick={watchDemo}
              data-testid="landing-watch-demo"
            />
          </div>
          <div className="sr-only lp-hero-copy">
            <p>PRACTICE WITH</p>
            <p>ICM BOT</p>
            <p>PRACTICE • IMPROVE • WIN</p>
            <p>Train with realistic poker situations. Understand ICM. Make better decisions.</p>
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
                poster="/videos/ICMBOT_video_poster.png"
                ref={videoRef}
                onPlay={() => setShowPoster(false)}
                onPause={() => setShowPoster(true)}
                onEnded={() => setShowPoster(true)}
              >
                <source src="/videos/ICM_BOT_demo_bot_profiles_narrated.mp4" type="video/mp4" />
              </video>
              {showPoster && (
                <button
                  type="button"
                  className="lp-video-poster"
                  data-testid="landing-video-poster"
                  aria-label="Play ICM BOT demo video"
                  onClick={startPlayback}
                >
                  <img src="/videos/ICMBOT_video_poster.png" alt="" draggable={false} />
                </button>
              )}
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
