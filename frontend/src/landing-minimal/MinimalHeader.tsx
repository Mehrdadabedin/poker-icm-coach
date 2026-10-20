import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";

/** Top bar of the minimal landing: a full-width black band with the logo on
 * the left, a plain "Log in" link and one "Start free" button on the right,
 * no section menu. The band is the logo's own background colour (#07080a),
 * so logo.png sits on it unchanged. */
export function MinimalHeader() {
  const t = useT();
  return (
    <header className="lm-header-band" data-testid="minimal-header">
      <div className="lm-header">
        <p className="lm-brand" data-testid="minimal-brand">
          <img className="lm-brand-logo" src="/Logo/logo.png" alt="ICMBOT" width={144} height={48} />
        </p>
        <nav className="lm-nav" aria-label={t("landing.nav")}>
          <Link className="lm-login" to="/login" data-testid="minimal-login">
            {t("landing.login")}
          </Link>
          <Link className="lm-btn lm-btn-quiet" to="/login" data-testid="minimal-signup">
            {t("landing.startFree")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
