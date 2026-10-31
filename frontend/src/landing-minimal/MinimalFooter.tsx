import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";

/** Footer: the copyright on the left, the practice-only note, Terms, Privacy
 * and Cookie settings on the right. The consent banner shows no floating button once a
 * choice is saved, so this link (the same window event the current landing
 * footer uses) is how a visitor changes their choice. */
export function MinimalFooter() {
  const t = useT();
  return (
    <footer className="lm-footer" data-testid="minimal-footer">
      <div className="lm-footer-inner">
        <span data-testid="minimal-copyright">{t("app.copyright")}</span>
        <span className="lm-footer-right">
          <span>{t("landing.practiceOnly")}</span>
          <Link className="lm-footer-link" to="/terms" data-testid="minimal-terms">{t("legal.terms")}</Link>
          <Link className="lm-footer-link" to="/privacy" data-testid="minimal-privacy">{t("legal.privacy")}</Link>
          <button
            type="button"
            className="lm-footer-link"
            onClick={() => window.dispatchEvent(new CustomEvent("icmbot:cookie-settings"))}
            data-testid="minimal-cookie-settings"
          >
            {t("landing.cookieSettings")}
          </button>
        </span>
      </div>
    </footer>
  );
}
