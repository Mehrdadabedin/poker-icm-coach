import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuth } from "../services/api";
import { useT } from "../i18n/I18n";

/** Landing route for the server-side OAuth redirect: /#/auth/callback?token=..
 *
 * The backend puts the session token in the fragment (never in a server log),
 * so this page stores it and immediately replaces the URL, then enters the app.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const t = useT();
  const [message, setMessage] = useState(t("callback.signingIn"));

  useEffect(() => {
    const token = params.get("token");
    const username = params.get("username");
    const error = params.get("error");
    if (error) {
      setMessage(
        t(error === "account_suspended" ? "callback.suspended" : "callback.failed"),
      );
      return;
    }
    if (!token || !username) {
      setMessage(t("callback.failed"));
      return;
    }
    saveAuth(token, username);
    navigate("/", { replace: true });
  }, [params, navigate, t]);

  return (
    <div className="page auth-callback-page" data-testid="auth-callback">
      <h1 className="screen-title">ICM MASTER</h1>
      <p className="home-tagline" data-testid="auth-callback-message">{message}</p>
    </div>
  );
}
