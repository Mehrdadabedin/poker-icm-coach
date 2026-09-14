import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuth } from "../services/api";

/** Landing route for the server-side OAuth redirect: /#/auth/callback?token=..
 *
 * The backend puts the session token in the fragment (never in a server log),
 * so this page stores it and immediately replaces the URL, then enters the app.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Signing you in\u2026");

  useEffect(() => {
    const token = params.get("token");
    const username = params.get("username");
    const error = params.get("error");
    if (error) {
      setMessage("Sign-in could not be completed. Please try again.");
      return;
    }
    if (!token || !username) {
      setMessage("Sign-in could not be completed. Please try again.");
      return;
    }
    saveAuth(token, username);
    navigate("/", { replace: true });
  }, [params, navigate]);

  return (
    <div className="page auth-callback-page" data-testid="auth-callback">
      <h1 className="screen-title">ICM MASTER</h1>
      <p className="home-tagline" data-testid="auth-callback-message">{message}</p>
    </div>
  );
}
