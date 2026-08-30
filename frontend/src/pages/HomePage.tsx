import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTournament } from "../services/api";

/** HOME screen: start a practice tournament or visit the tools. */
export function HomePage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const startPractice = async () => {
    setStarting(true);
    try {
      const state = await createTournament(10); // fast mode for practice
      navigate(`/table/${state.tableId}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="page home-page" data-testid="home-page">
      <h1 className="screen-title">POKER ICM COACH</h1>
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
    </div>
  );
}
