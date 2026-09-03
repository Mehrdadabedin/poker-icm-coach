import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, createTournament, getToken, getUsername, logout } from "../services/api";
import { Copyright } from "../components/Copyright";
import { LoginForm } from "../components/LoginForm";

/** HOME screen: username login (A03) then start a practice tournament or
 * visit the tools. The authenticated username replaces "Hero" everywhere. */
export function HomePage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [user, setUser] = useState<string | null>(getToken() ? getUsername() : null);

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
    return (
      <div className="page home-page" data-testid="home-page">
        <h1 className="screen-title" data-testid="app-title">ICM MASTER</h1>
        <p className="home-tagline">9-player tournament practice with an ICM coach</p>
        <LoginForm onLogin={setUser} />
        <Copyright />
      </div>
    );
  }

  return (
    <div className="page home-page" data-testid="home-page">
      <h1 className="screen-title" data-testid="app-title">ICM MASTER</h1>
      <p className="home-tagline">9-player tournament practice with an ICM coach</p>
      <div className="session-bar" data-testid="session-bar">
        <span>Playing as <b data-testid="session-username">{user}</b></span>
        <button className="btn btn-small" onClick={() => void signOut()} data-testid="logout-btn">
          LOG OUT
        </button>
      </div>
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