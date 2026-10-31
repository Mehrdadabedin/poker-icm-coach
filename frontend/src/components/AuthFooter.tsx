import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";

export type AuthMode = "signin" | "signup";

interface AuthSwitchProps {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}

/** The prompt that moves between the sign-in view and the sign-up flow. */
export function AuthSwitch({ mode, onSwitch }: AuthSwitchProps) {
  const t = useT();
  if (mode === "signup") {
    return (
      <p className="auth-switch">
        {t("auth.haveAccount")}{" "}
        <button
          type="button"
          className="auth-link"
          onClick={() => onSwitch("signin")}
          data-testid="go-signin"
        >
          {t("auth.signIn")}
        </button>
      </p>
    );
  }
  return (
    <p className="auth-switch">
      {t("auth.noAccount")}{" "}
      <button
        type="button"
        className="auth-link"
        onClick={() => onSwitch("signup")}
        data-testid="go-signup"
      >
        {t("auth.signUp")}
      </button>
    </p>
  );
}

/** The Terms and the Privacy Policy, in a new tab so a half-filled form stays.
 * Shown for signing in too: Continue with Google creates the account from there. */
export function AuthAccept() {
  const t = useT();
  return (
    <p className="auth-accept" data-testid="auth-accept">
      {t("auth.accept.before")}
      <Link to="/terms" target="_blank" rel="noopener" data-testid="auth-terms">{t("legal.terms")}</Link>
      {t("auth.accept.and")}
      <Link to="/privacy" target="_blank" rel="noopener" data-testid="auth-privacy">{t("legal.privacy")}</Link>
      {t("auth.accept.after")}
    </p>
  );
}

/** Brand caps line at the bottom of the panel, with the short gold rule. */
export function AuthLegal() {
  return (
    <div className="auth-legal">
      <p className="auth-legal-text">PRACTICE • IMPROVE • WIN</p>
      <span className="auth-legal-rule" aria-hidden="true" />
    </div>
  );
}

interface SignedInNoteProps {
  username: string | null;
}

/** Shows which account a stored token belongs to, if any. */
export function SignedInNote({ username }: SignedInNoteProps) {
  const t = useT();
  if (!username) return null;
  return (
    <p className="auth-signed-in">
      {t("auth.signedInAs")} <b>{username}</b>
    </p>
  );
}
