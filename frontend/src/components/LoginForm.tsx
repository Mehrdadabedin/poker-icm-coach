import { useState } from "react";
import { getUsername, login, saveAuth } from "../services/api";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

/** Username sign-in (A03). Issues a backend bearer token; the username is
 * displayed everywhere the app previously showed the hard-coded "Hero". */
export function LoginForm({ onLogin }: LoginFormProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const auth = await login(name);
      saveAuth(auth.token, auth.username);
      onLogin(auth.username);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-panel" data-testid="login-panel">
      <h2>PLAYER LOGIN</h2>
      <p className="note">Enter a username to start your private practice table.</p>
      <input
        className="login-input"
        type="text"
        value={name}
        maxLength={24}
        placeholder="Username"
        aria-label="username"
        data-testid="username-input"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
      />
      <button className="btn btn-primary" onClick={() => void submit()} disabled={busy || !name.trim()} data-testid="login-submit">
        {busy ? "SIGNING IN…" : "SIGN IN"}
      </button>
      {error && <p className="error-box" data-testid="login-error">{error}</p>}
      {getUsername() && <p className="note">Currently signed in as <b>{getUsername()}</b></p>}
    </div>
  );
}
