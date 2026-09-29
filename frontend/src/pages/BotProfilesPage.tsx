/** A26/A27 — BOT PROFILES: build the 8-BOT opponent lineup. Each of the four
 * personalities is a reusable template; the user adds/removes instances until
 * all 8 opponent seats are filled, then ADD BOTS TO TABLE creates the
 * tournament with the chosen composition. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copyright } from "../components/Copyright";
import {
  BOT_PROFILES,
  MAX_BOTS,
  getLineup,
  lineupFromCounts,
  saveLineup,
} from "../models/botProfiles";
import { createTournament } from "../services/api";

function initialCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const profile of BOT_PROFILES) counts[profile.id] = 0;
  for (const backend of getLineup()) {
    const profile = BOT_PROFILES.find((p) => p.backend === backend);
    if (profile) counts[profile.id] += 1;
  }
  return counts;
}

export function BotProfilesPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const total = BOT_PROFILES.reduce((sum, p) => sum + (counts[p.id] ?? 0), 0);

  const add = (id: string) => {
    setError(null);
    if (total >= MAX_BOTS) return;
    setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };

  const remove = (id: string) => {
    setError(null);
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));
  };

  // A27: BACK returns to the previous logical screen (e.g. the opponent
  // choice for the CHOOSE flow); direct visits simply go back.
  const back = () => navigate(-1);

  const addBots = async () => {
    if (total !== MAX_BOTS) {
      setError("Please select 8 opponents to fill the tournament.");
      return;
    }
    setStarting(true);
    try {
      const lineup = lineupFromCounts(counts);
      saveLineup(lineup);
      const state = await createTournament(10, undefined, lineup);
      navigate(`/table/${state.tableId}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="page bot-profiles-page" data-testid="bot-profiles-page">
      <div className="bot-profiles-bar">
        <h1 className="screen-title">BOT PROFILES</h1>
        <button type="button" className="bot-profile-back" onClick={back} data-testid="bot-profiles-back">
          BACK
        </button>
      </div>
      <p className="bot-profiles-intro">
        Build your opponent lineup. Each personality can be used more than once.
      </p>
      <div className="bot-profiles-grid">
        {BOT_PROFILES.map((profile) => {
          const count = counts[profile.id] ?? 0;
          const full = total >= MAX_BOTS;
          return (
            <div key={profile.id} className="bot-profile-card" data-testid={`bot-profile-${profile.id}`}>
              <span
                className="bot-avatar"
                style={{ backgroundColor: profile.avatar.color }}
                aria-hidden="true"
              >
                {profile.avatar.initials}
              </span>
              <b className="bot-profile-name">{profile.name}</b>
              <span className="bot-profile-style">{profile.style}</span>
              <span className="bot-profile-desc">{profile.description}</span>
              <div className="bot-profile-counter">
                <button
                  type="button"
                  aria-label={`Remove ${profile.name}`}
                  disabled={count === 0}
                  onClick={() => remove(profile.id)}
                  data-testid={`bot-profile-remove-${profile.id}`}
                >
                  −
                </button>
                <span className="bot-profile-count" data-testid={`bot-profile-count-${profile.id}`}>
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`Add ${profile.name}`}
                  disabled={full}
                  onClick={() => add(profile.id)}
                  data-testid={`bot-profile-add-${profile.id}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="bot-profiles-total" data-testid="bot-profiles-total">
        OPPONENTS {total} / {MAX_BOTS}
      </p>

      <div className="bot-profiles-summary" data-testid="bot-profiles-summary">
        <b>YOUR OPPONENTS</b>
        {BOT_PROFILES.filter((p) => (counts[p.id] ?? 0) > 0).map((p) => (
          <span key={p.id}>
            {p.name} — {p.style} × {counts[p.id]}
          </span>
        ))}
        {total === 0 && <span>None selected yet.</span>}
      </div>

      {error && (
        <p className="bot-profiles-error" role="alert" data-testid="bot-profiles-error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void addBots()}
        disabled={starting}
        data-testid="add-bots-to-table"
      >
        {starting ? "CREATING TABLE…" : "ADD BOTS TO TABLE"}
      </button>
      <Copyright />
    </div>
  );
}
