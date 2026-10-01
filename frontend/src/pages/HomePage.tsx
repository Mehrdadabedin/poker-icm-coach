import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuth, getToken, getUsername, logout, me } from "../services/api";
import { Copyright } from "../components/Copyright";
import { BrandLogo } from "../components/BrandLogo";
import { LoginForm } from "../components/LoginForm";

/** HOME screen: username login (A03) then start a practice tournament or
 * visit the tools. The authenticated username replaces "Hero" everywhere. */
export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authNotice = (location.state as { authNotice?: string } | null)?.authNotice ?? null;
  const [user, setUser] = useState<string | null>(() => (getToken() ? getUsername() : null));

  // BUG 2 hardening: a stored token may be stale/invalid (backend restart,
  // expiry, credentials changed). Validate it on load; if the backend rejects
  // it, clear the saved session and show the login form instead of leaving the
  // user in a broken half-authenticated state.
  useEffect(() => {
    if (!getToken()) return;
    me()
      .then((who) => {
        if (who.username) setUser(who.username);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      });
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; always clear locally
    }
    clearAuth();
    setUser(null);
  };

  const startPractice = () => {
    // A27: START PRACTICE now opens the opponent-choice screen.
    navigate("/start");
  };

  if (!user) {
    // The sign-in screen owns the full viewport: brand header, then the panel.
    return (
      <div className="page home-page auth-page" data-testid="home-page">
        <div className="auth-shell">
          <header className="auth-brand">
            {/* A23: the centred sign-in brand is the shared logo mark, so the
                screen shows the same artwork as every other header. The heading
                keeps its accessible name through the mark's hidden text. */}
            <h1 className="auth-brand-logo" data-testid="app-title"><BrandLogo /></h1>
            <span className="auth-title-rule" aria-hidden="true" />
          </header>
          {authNotice && (
            <p className="auth-notice" role="alert" data-testid="auth-session-notice">
              {authNotice}
            </p>
          )}
          <LoginForm onLogin={setUser} />
          <Copyright />
        </div>
      </div>
    );
  }

  return (
    <div className="page home-page" data-testid="home-page">
      <div className="top-bar app-header" data-testid="session-bar">
        <h1 className="screen-title header-title" data-testid="app-title"><BrandLogo /></h1>
        <div className="header-right">
          <span className="header-user">Playing as <b data-testid="session-username">{user}</b></span>
          <button className="btn btn-logout" onClick={() => void signOut()} data-testid="logout-btn">
            LOG OUT
          </button>
        </div>
      </div>
      <p className="home-tagline">9-player tournament practice with an ICM coach</p>
      <div className="home-menu">
        <button className="btn btn-primary" onClick={startPractice} data-testid="start-practice">
          START PRACTICE
        </button>
        <button className="btn" onClick={() => navigate("/bot-profiles")} data-testid="menu-bot-profiles">BOT PROFILES</button>
        <button className="btn" onClick={() => navigate("/ranges")}>RANGES</button>
        <button className="btn" onClick={() => navigate("/coach")}>ICM COACH</button>
        <button className="btn" onClick={() => navigate("/settings")}>TOURNAMENT SETTINGS</button>
        <button className="btn" onClick={() => navigate("/history")}>HAND HISTORY</button>
        <button className="btn" onClick={() => navigate("/statistics")}>STATISTICS</button>
        <button className="btn" onClick={() => navigate("/admin")} data-testid="menu-admin">ADMIN</button>
      </div>
      <Copyright />
    </div>
  );
}