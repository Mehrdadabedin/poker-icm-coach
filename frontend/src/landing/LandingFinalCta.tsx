import { Link } from "react-router-dom";
import { GoogleIcon } from "../components/AuthIcons";
import { googleSignInUrl } from "../services/api";

interface LandingFinalCtaProps {
  googleAvailable: boolean;
}

function continueWithGoogle() {
  window.location.href = googleSignInUrl();
}

/** A47 — final CTA card and footer, matching the mockup. One rounded card:
 * heading + sub-line + buttons on the left, the champion artwork filling the
 * right half. Continue with Google is only offered when the backend
 * /api/auth/providers advertises the provider. */
export function LandingFinalCta({ googleAvailable }: LandingFinalCtaProps) {
  return (
    <section className="lp-final" aria-labelledby="lp-final-title" data-testid="landing-final-cta">
      <div className="lp-inner">
        <div className="lp-final-card" data-testid="landing-final-card">
          <div className="lp-final-copy">
            <h2 className="lp-final-title" id="lp-final-title">
              PLAY YOUR FIRST TOURNAMENT TODAY.
            </h2>
            <p className="lp-final-sub">Nine players. One champion. Will it be you?</p>
            <div className="lp-final-actions">
              <Link className="lp-btn lp-btn-gold lp-btn-xl" to="/login" data-testid="landing-final-start">
                START TRAINING FREE
              </Link>
              {googleAvailable && (
                <button
                  type="button"
                  className="lp-btn lp-btn-google"
                  onClick={continueWithGoogle}
                  data-testid="landing-google"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
              )}
            </div>
          </div>
          <img
            className="lp-final-img"
            src="/images/tournament-champion.webp"
            alt="ICMBOT tournament champion holding the trophy"
            data-testid="landing-champion-img"
          />
        </div>
      </div>
      <footer className="lp-footer" data-testid="landing-footer">
        <p className="lp-tagline">PRACTICE · IMPROVE · WIN</p>
        <nav className="lp-footer-links" aria-label="Footer">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("icmbot:cookie-settings"));
            }}
          >
            Cookie settings
          </button>
        </nav>
        <p className="lp-copyright">© 2026 ICMBOT. Practice only. No real-money gambling.</p>
      </footer>
    </section>
  );
}
