import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTournament } from "../services/api";
import { Copyright } from "../components/Copyright";

/** TRAINING screen: choose COACH MODE or TEST MODE for a practice run. */
export function TrainingPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"coach" | "test">("coach");

  const start = async () => {
    const state = await createTournament(10);
    navigate(`/table/${state.tableId}`, { state: { trainingMode: mode } });
  };

  return (
    <div className="page" data-testid="training-page">
      <h1 className="screen-title">TRAINING MODE</h1>
      <div className="mode-cards">
        <button className={mode === "coach" ? "mode-card active" : "mode-card"} onClick={() => setMode("coach")}>
          <b>COACH MODE</b>
          <span>Recommendations shown before you act.</span>
        </button>
        <button className={mode === "test" ? "mode-card active" : "mode-card"} onClick={() => setMode("test")}>
          <b>TEST MODE</b>
          <span>Recommendations hidden; your decision is graded after.</span>
        </button>
      </div>
      <button className="btn btn-primary" onClick={start} data-testid="training-start">START TRAINING</button>
      <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      <Copyright />
    </div>
  );
}
