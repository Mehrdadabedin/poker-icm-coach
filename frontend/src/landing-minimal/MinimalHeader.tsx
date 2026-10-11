import { Link } from "react-router-dom";

/** Top bar of the minimal landing: a wordmark on the left, a plain "Log in"
 * link and one "Start free" button on the right, no section menu. The logo
 * is logo.png made for light backgrounds (logo-on-light.png): the black
 * background removed and the white lettering turned dark, gold kept. */
export function MinimalHeader() {
  return (
    <header className="lm-header" data-testid="minimal-header">
      <p className="lm-brand" data-testid="minimal-brand">
        <img className="lm-brand-logo" src="/Logo/logo-on-light.png" alt="ICMBOT" width={203} height={48} />
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
