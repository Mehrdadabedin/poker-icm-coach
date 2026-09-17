export type AuthMode = "signin" | "signup";

interface AuthSwitchProps {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}

/** The prompt that moves between the sign-in view and the sign-up flow. */
export function AuthSwitch({ mode, onSwitch }: AuthSwitchProps) {
  if (mode === "signup") {
    return (
      <p className="auth-switch">
        Already have an account?{" "}
        <button
          type="button"
          className="auth-link"
          onClick={() => onSwitch("signin")}
          data-testid="go-signin"
        >
          Sign in
        </button>
      </p>
    );
  }
  return (
    <p className="auth-switch">
      Don&apos;t have an account?{" "}
      <button
        type="button"
        className="auth-link"
        onClick={() => onSwitch("signup")}
        data-testid="go-signup"
      >
        Sign up
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
  if (!username) return null;
  return (
    <p className="auth-signed-in">
      Signed in as <b>{username}</b>
    </p>
  );
}
