/** A27 — CHOOSE YOUR OPPONENTS: the practice setup screen shown when START
 * PRACTICE is pressed. RANDOM keeps the existing default table creation;
 * CHOOSE opens the BOT PROFILES lineup builder. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { getSelectedProfile } from "../models/botProfiles";
import { createTournament } from "../services/api";

export function OpponentChoicePage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const randomOpponents = async () => {
    setStarting(true);
    try {
      const profile = getSelectedProfile(); // legacy A26 single selection
      const state = await createTournament(10, profile?.backend);
      navigate(`/table/${state.tableId}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="page" data-testid="opponent-choice-page">
      <PageHeader />
      <h1 className="screen-title">CHOOSE YOUR OPPONENTS</h1>
      <p className="bot-profiles-intro">How would you like to practice?</p>
      <div className="opponent-choice">
        <button
          className="btn btn-primary"
          onClick={() => void randomOpponents()}
          disabled={starting}
          data-testid="opponents-random"
        >
          {starting ? "STARTING…" : "RANDOM OPPONENTS"}
        </button>
        <button
          className="btn"
          onClick={() => navigate("/bot-profiles")}
          data-testid="opponents-choose"
        >
          CHOOSE OPPONENTS
        </button>
      </div>
      <Copyright />
    </div>
  );
}
