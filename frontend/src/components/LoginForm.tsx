import { useEffect, useState } from "react";
import {
  getAuthProviders,
  getUsername,
  login,
  register,
  saveAuth,
  type AuthProviders,
} from "../services/api";
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "./AuthIcons";
import { AuthField } from "./AuthField";
import { AuthLegal, AuthSwitch, SignedInNote, type AuthMode } from "./AuthFooter";
import { AuthMessages, type NoticeTone } from "./AuthMessages";
import { ProviderButtons } from "./ProviderButtons";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const MIN_PASSWORD_LENGTH = 8;

/** Credential sign-in first, with the provider pills on top and sign-up behind
 * "Don't have an account? Sign up". */
export function LoginForm({ onLogin }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("status");
  const [success, setSuccess] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const stored = getUsername();

  // One lookup per screen: the pills need to know whether Google is configured
  // server-side. A failure must not block username/password sign-in.
  useEffect(() => {
    getAuthProviders()
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  const resetForm = (next: AuthMode) => {
    setMode(next);
    setPassword("");
    setConfirm("");
    setReveal(false);
    setError(null);
    setNotice(null);
    setNoticeTone("status");
    setSuccess(null);
  };

  const validPassword = password.length >= MIN_PASSWORD_LENGTH;

  const validate = (): boolean => {
    if (!name.trim()) {
      setError("Username is required.");
      return false;
    }
    if (!password) {
      setError("Password is required.");
      return false;
    }
    if (mode === "signup" && !validPassword) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return false;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const authenticate = async () => {
    if (busy || !validate()) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const created = await register(name, password);
        // Registration authorizes the account immediately (the backend returns
        // a session token), so no second sign-in is needed.
        const normalized = created.username.length ? created.username : name.trim();
        saveAuth(created.token, normalized);
        setSuccess(`Account "${normalized}" created. You are now signed in.`);
        onLogin(normalized);
      } else {
        const auth = await login(name, password);
        saveAuth(auth.token, auth.username);
        onLogin(auth.username);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    setError(null);
    setNotice(null);
    setNoticeTone("status");
    void authenticate();
  };

  return (
    <div className="login-panel" data-testid="login-panel">
      <ProviderButtons
        providers={providers}
        onNotice={(message, tone) => {
          setNotice(message);
          setNoticeTone(tone);
        }}
      />

      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <AuthField
          kind="mail"
          type="text"
          value={name}
          placeholder="Email or username"
          label="Email or username"
          testId="username-input"
          autoComplete="username"
          maxLength={64}
          onChange={setName}
          onSubmit={submit}
        />
        <AuthField
          kind="lock"
          type={reveal ? "text" : "password"}
          value={password}
          placeholder="Password"
          label="Password"
          testId="password-input"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          onChange={setPassword}
          onSubmit={submit}
          trailing={
            <button
              type="button"
              className="auth-eye"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "Hide password" : "Show password"}
              aria-pressed={reveal}
              data-testid="password-toggle"
            >
              {reveal ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />
        {mode === "signup" && (
          <AuthField
            kind="lock"
            type="password"
            value={confirm}
            placeholder="Confirm password"
            label="Confirm password"
            testId="confirm-password-input"
            autoComplete="new-password"
            onChange={setConfirm}
            onSubmit={submit}
          />
        )}

        <button type="submit" className="auth-submit" disabled={busy} data-testid="auth-submit">
          <span>{busy ? "Please wait\u2026" : mode === "signin" ? "Sign in" : "Sign up"}</span>
          <ArrowRightIcon />
        </button>
      </form>

      <AuthMessages error={error} notice={notice} noticeTone={noticeTone} success={success} />
      <AuthSwitch mode={mode} onSwitch={resetForm} />
      {mode === "signin" && <SignedInNote username={stored} />}
      <AuthLegal />
    </div>
  );
}
