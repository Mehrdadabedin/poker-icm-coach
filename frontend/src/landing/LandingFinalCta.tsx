import { Link } from "react-router-dom";
import { googleSignInUrl } from "../services/api";

interface LandingFinalCtaProps {
  googleAvailable: boolean;
}

function continueWithGoogle() {
  window.location.href = googleSignInUrl();
}

/** A47 — final CTA and footer. Continue with Google is only offered when the
 * backend /api/auth/providers advertises the provider; the gold START TRAINING
 * FREE button is the primary path for everyone. */
export function LandingFinalCta({ googleAvailable }: LandingFinalCtaProps) {
  return (
    <section className="lp-final lp-band-soft" aria-labelledby="lp-final-title" data-testid="landing-final-cta">
      <div className="lp-inner lp-final-layout">
        <div className="lp-final-copy">
          <h2 className="lp-final-title" id="lp-final-title">
            PLAY YOUR FIRST TOURNAMENT TODAY.
          </h2>
          <div className="lp-final-actions">
            <Link className="lp-btn lp-btn-gold lp-btn-xl" to="/login" data-testid="landing-final-start">
              START TRAINING FREE
            </Link>
            {googleAvailable && (
              <button
                type="button"
                className="lp-btn lp-btn-outline"
                onClick={continueWithGoogle}
                data-testid="landing-google"
              >
                Continue with Google
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
      <footer className="lp-footer" data-testid="landing-footer">
        <p className="lp-tagline">Practice · Improve · Win</p>
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
        <p className="lp-copyright">© 2026 ICMBOT. Practice only.</p>
      </footer>
    </section>
  );
}
