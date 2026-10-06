import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

const NAV_LINKS = [
  { label: "What is ICM", target: "lp-quiz" },
  { label: "How it works", target: "lp-how" },
  { label: "Opponents", target: "lp-opponents" },
  { label: "FAQ", target: "lp-faq" },
];

/** A47 landing header: solid background, brand left, section links (desktop
 * only) and the LOGIN / SIGN UP buttons right. Everything scrolls inside the
 * page; nothing leaks through the #07080A band. */
export function LandingHeader() {
  return (
    <header className="lp-header" data-testid="landing-header">
      <p className="lp-brand" data-testid="landing-brand"><BrandLogo /></p>
      <nav className="lp-nav-links" aria-label="Landing sections">
        {NAV_LINKS.map((link) => (
          <a key={link.target} className="lp-nav-link" href={`#${link.target}`}>
            {link.label}
          </a>
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
    </header>
  );
}
