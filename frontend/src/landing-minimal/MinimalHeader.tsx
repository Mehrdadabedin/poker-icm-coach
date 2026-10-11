import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

/** Top bar of the minimal landing: the logo on the left, a plain "Log in" link
 * and one "Start free" button on the right. There is no section menu. */
export function MinimalHeader() {
  return (
    <header className="lm-header" data-testid="minimal-header">
      <p className="lm-brand" data-testid="minimal-brand"><BrandLogo /></p>
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
