import { useState } from "react";
import { getUsername, login, register, saveAuth } from "../services/api";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const MIN_PASSWORD_LENGTH = 8;

type Mode = "signin" | "signup";

/** Registration-first authentication entry (A18).
 * First screen offers SIGN IN / SIGN UP. New users register (username +
 * password + confirm), then sign in. Existing users sign in with credentials.
 * Matches the existing dark/gold compact ICM visual identity. */
export function LoginForm({ onLogin }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validPassword = password.length >= MIN_PASSWORD_LENGTH;

  const resetForm = (m: Mode) => {
    setMode(m);
    setPassword("");
    setConfirm("");
    setError(null);
    setNotice(null);
  };

  const signIn = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!name.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    setBusy(true);
    try {
      const auth = await login(name, password);
      saveAuth(auth.token, auth.username);
      onLogin(auth.username);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!name.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (!validPassword) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(name, password);
      setNotice(
        `Account "${name.trim()}" created. You can now sign in with your username and password.`,
      );
      setName(name.trim());
      setPassword("");
      setConfirm("");
      setMode("signin");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (mode === "signin") void signIn();
    else void signUp();
  };

  return (
    <div className="login-panel" data-testid="login-panel">
      <div className="auth-mode-switch" data-testid="auth-mode-switch">
        <button
          className={`btn auth-mode-btn ${mode === "signin" ? "active" : ""}`}
          onClick={() => resetForm("signin")}
          data-testid="mode-signin"
        >
          SIGN IN
        </button>
        <button
          className={`btn auth-mode-btn ${mode === "signup" ? "active" : ""}`}
          onClick={() => resetForm("signup")}
          data-testid="mode-signup"
        >
          SIGN UP
        </button>
      </div>

      <h2>{mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}</h2>
      <p className="note">
        {mode === "signin"
          ? "Sign in to continue to your private practice table."
          : "New here? Create an account, then sign in."}
      </p>

      <input
        className="login-input"
        type="text"
        value={name}
        maxLength={64}
        placeholder="Username"
        aria-label="username"
        data-testid="username-input"
        onChange={(e) => setName(e.target.value)}
        autoComplete="username"
      />
      <input
        className="login-input"
        type="password"
        value={password}
        placeholder="Password"
        aria-label="password"
        data-testid="password-input"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === "signup" && (
        <input
          className="login-input"
          type="password"
          value={confirm}
          placeholder="Confirm password"
          aria-label="confirm password"
          data-testid="confirm-password-input"
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      )}
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={busy}
        data-testid="auth-submit"
      >
        {busy ? "PLEASE WAIT…" : mode === "signin" ? "SIGN IN" : "SIGN UP"}
      </button>

      {mode === "signin" ? (
        <button className="btn btn-small auth-switch-link" onClick={() => resetForm("signup")} data-testid="go-signup">
          No account? SIGN UP
        </button>
      ) : (
        <button className="btn btn-small auth-switch-link" onClick={() => resetForm("signin")} data-testid="go-signin">
          Already registered? SIGN IN
        </button>
      )}

      {error && <p className="error-box" data-testid="auth-error">{error}</p>}
      {notice && <p className="success-box" data-testid="auth-success">{notice}</p>}
      {mode === "signin" && getUsername() && (
        <p className="note">Currently signed in as <b>{getUsername()}</b></p>
      )}
    </div>
  );
}
