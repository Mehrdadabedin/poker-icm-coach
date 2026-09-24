import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, createTournament, getToken, getUsername, logout, me } from "../services/api";
import { Copyright } from "../components/Copyright";
import { BrandLogo } from "../components/BrandLogo";
import { LoginForm } from "../components/LoginForm";

/** HOME screen: username login (A03) then start a practice tournament or
 * visit the tools. The authenticated username replaces "Hero" everywhere. */
export function HomePage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
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

  const startPractice = async () => {
    setStarting(true);
    try {
      const state = await createTournament(10); // fast mode for practice
      navigate(`/table/${state.tableId}`);
    } catch {
      setStarting(false);
    }
  };

  if (!user) {
    // The sign-in screen owns the full viewport: brand header, then the panel.
    return (
      <div className="page home-page auth-page" data-testid="home-page">
        <div className="auth-shell">
          <header className="auth-brand">
            <h1 className="auth-title" data-testid="app-title">ICM MASTER</h1>
            <span className="auth-title-rule" aria-hidden="true" />
            <p className="auth-subtitle">9-player tournament practice with an ICM coach</p>
          </header>
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
        <button className="btn btn-primary" onClick={startPractice} disabled={starting} data-testid="start-practice">
          {starting ? "STARTING…" : "START PRACTICE"}
        </button>
        <button className="btn" onClick={() => navigate("/training")}>TRAINING</button>
        <button className="btn" onClick={() => navigate("/ranges")}>RANGES</button>
        <button className="btn" onClick={() => navigate("/coach")}>ICM COACH</button>
        <button className="btn" onClick={() => navigate("/settings")}>TOURNAMENT SETTINGS</button>
        <button className="btn" onClick={() => navigate("/history")}>HAND HISTORY</button>
        <button className="btn" onClick={() => navigate("/statistics")}>STATISTICS</button>
      </div>
      <Copyright />
    </div>
  );
}