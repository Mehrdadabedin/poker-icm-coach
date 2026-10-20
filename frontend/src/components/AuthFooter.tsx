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
