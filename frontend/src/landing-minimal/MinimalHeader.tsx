import { Link } from "react-router-dom";

/** Top bar of the minimal landing: a wordmark on the left, a plain "Log in"
 * link and one "Start free" button on the right, no section menu. The site
 * logo is white lettering on black, so this light page uses the poker-chip
 * mark from the favicon with the name set in type instead. */
export function MinimalHeader() {
  return (
    <header className="lm-header" data-testid="minimal-header">
      <p className="lm-brand" data-testid="minimal-brand">
        <img className="lm-brand-mark" src="/icon-192.png" alt="" width={32} height={32} />
        <span className="lm-brand-name">ICM<span className="lm-accent">BOT</span></span>
      </p>
      <nav className="lm-nav" aria-label="Account">
        <Link className="lm-login" to="/login" data-testid="minimal-login">
          Log in
        </Link>
        <Link className="lm-btn lm-btn-quiet" to="/login" data-testid="minimal-signup">
          Start free
        </Link>
      </nav>
    </header>
  );
}
