import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { scrollToSection } from "./scrollTo";

const NAV_LINKS = [
  { label: "What is ICM", target: "lp-quiz" },
  { label: "The Coach", target: "lp-coach" },
  { label: "How it works", target: "lp-how" },
  { label: "Opponents", target: "lp-opponents" },
  { label: "FAQ", target: "lp-faq" },
];

/** A47 landing header: solid background, brand left, section buttons
 * (desktop only) and the LOGIN / SIGN UP buttons right. The section buttons
 * scroll in-page; the app is a HashRouter, so they never set location.hash. */
export function LandingHeader() {
  return (
    <header className="lp-header" data-testid="landing-header">
      <div className="lp-header-inner">
        <p className="lp-brand" data-testid="landing-brand"><BrandLogo /></p>
        <nav className="lp-nav-links" aria-label="Landing sections">
          {NAV_LINKS.map((link) => (
            <button
              key={link.target}
              type="button"
              className="lp-nav-link"
              onClick={() => scrollToSection(link.target)}
            >
              {link.label}
            </button>
          ))}
        </nav>
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
      </div>
    </header>
  );
}
