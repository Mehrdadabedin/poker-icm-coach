/* Admin bootstrap first-login: force-change the temporary Admin password.

Reached right after the first Admin login with the temporary bootstrap password. The backend marks the
Admin account with a pending forced change; this page replaces the password
through the existing session-authenticated endpoint and then proceeds to the
Admin dashboard. The bootstrap password is temporary by design; the notice
says so. The backend still enforces Admin authorization.
*/
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copyright } from "../components/Copyright";
import { AuthError, changePassword, clearAuth, getToken } from "../services/api";

const MIN_PASSWORD_LENGTH = 8;

export function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
    }
  }, [navigate]);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(newPassword);
      navigate("/admin");
    } catch (caught) {
      if (caught instanceof AuthError) {
        clearAuth();
        navigate("/login", {
          state: { authNotice: "Session expired \u2014 please log in again." },
        });
        return;
      }
      setBusy(false);
      setError((caught as Error).message);
    }
  };

  return (
    <div className="page admin-page" data-testid="change-password-page">
      <h1 className="screen-title">Change Admin Password</h1>
      <div className="admin-change-notice" data-testid="change-notice" role="alert">
        The initial Admin password is temporary (bootstrap only). Choose a new
        password before continuing to the Admin dashboard.
      </div>
      <label className="admin-change-field">
        New password
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          data-testid="change-new"
          autoComplete="new-password"
        />
      </label>
      <label className="admin-change-field">
        Confirm new password
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          data-testid="change-confirm"
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="admin-change-error" role="alert" data-testid="change-error">{error}</p>
      )}
      <div className="toolbar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void submit()}
          data-testid="change-submit"
        >
          {busy ? "SAVING…" : "SAVE NEW PASSWORD"}
        </button>
        <button type="button" className="btn btn-small" onClick={() => navigate("/")}>
          HOME
        </button>
      </div>
      <Copyright />
    </div>
  );
}
