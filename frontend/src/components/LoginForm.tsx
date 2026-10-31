import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { AuthAccept, AuthSwitch, SignedInNote, type AuthMode } from "./AuthFooter";
import { AuthMessages } from "./AuthMessages";
import { ProviderButtons } from "./ProviderButtons";
import { useT } from "../i18n/I18n";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const MIN_PASSWORD_LENGTH = 8;

/** Credential sign-in first, with the provider pills on top and sign-up behind
 * "Don't have an account? Sign up". */
export function LoginForm({ onLogin }: LoginFormProps) {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setSuccess(null);
  };

  const validPassword = password.length >= MIN_PASSWORD_LENGTH;

  const validate = (): boolean => {
    if (!name.trim()) {
      setError(t("auth.usernameRequired"));
      return false;
    }
    if (!password) {
      setError(t("auth.passwordRequired"));
      return false;
    }
    if (mode === "signup" && !validPassword) {
      setError(t("auth.passwordShort", { min: MIN_PASSWORD_LENGTH }));
      return false;
    }
    if (mode === "signup" && password !== confirm) {
      setError(t("auth.passwordMismatch"));
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
        setSuccess(t("auth.created", { name: normalized }));
        onLogin(normalized);
      } else {
        const auth = await login(name, password);
        saveAuth(auth.token, auth.username);
        // Backend-declared account level (Admin correction): the backend
        // decides Admin and forced-change state; the client only routes.
        if (auth.must_change_password) {
          navigate("/change-password");
          return;
        }
        if (auth.admin) {
          navigate("/admin");
          return;
        }
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
    void authenticate();
  };

  return (
    <div className="login-panel" data-testid="login-panel">
      <ProviderButtons providers={providers} onNotice={setNotice} />

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
          placeholder={t("auth.username")}
          label={t("auth.username")}
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
          placeholder={t("auth.password")}
          label={t("auth.password")}
          testId="password-input"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          onChange={setPassword}
          onSubmit={submit}
          trailing={
            <button
              type="button"
              className="auth-eye"
              onClick={() => setReveal((value) => !value)}
              aria-label={t(reveal ? "auth.hidePassword" : "auth.showPassword")}
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
            placeholder={t("auth.confirm")}
            label={t("auth.confirm")}
            testId="confirm-password-input"
            autoComplete="new-password"
            onChange={setConfirm}
            onSubmit={submit}
          />
        )}

        <button type="submit" className="auth-submit" disabled={busy} data-testid="auth-submit">
          <span>{t(busy ? "auth.wait" : mode === "signin" ? "auth.signIn" : "auth.signUp")}</span>
          <ArrowRightIcon />
        </button>
      </form>

      <AuthMessages error={error} notice={notice} success={success} />
      <AuthSwitch mode={mode} onSwitch={resetForm} />
      <AuthAccept />
      {mode === "signin" && <SignedInNote username={stored} />}
    </div>
  );
}
