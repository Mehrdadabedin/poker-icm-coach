import { formatChips, type StandingRow } from "../models/game";
import { ordinal } from "./TournamentWinner";

/** The final standings once the busted hero ends the game (plan 092): the
 * players still in by chips, then the players already out in the order they
 * went. It covers the table like the champion screen. */
export function FinalStandings({ rows, onNewGame }: { rows: StandingRow[]; onNewGame?: () => void }) {
  const hero = rows.find((r) => r.isHero);
  return (
    <div className="tournament-winner final-standings" data-testid="final-standings" role="dialog"
      aria-label="Final standings">
      <div className="final-standings-panel">
        <div className="final-standings-head">
          <div>
            <b className="final-standings-title">FINAL STANDINGS</b>
            <p className="final-standings-note">
              Ended by chips{hero ? ` · you finished ${ordinal(hero.place)} of ${rows.length}` : ""}
            </p>
          </div>
          {onNewGame && (
            <button type="button" className="btn btn-small btn-primary" onClick={onNewGame}
              data-testid="standings-new-game">
              START NEW GAME
            </button>
          )}
        </div>
        <ol className="final-standings-list">
          {rows.map((r) => (
            <li key={r.seat} data-testid={`standing-${r.place}`}
              className={[r.isHero && "is-hero", r.place === 1 && "is-first", r.out && "is-out"]
                .filter(Boolean).join(" ")}>
              <span className="standing-place">{ordinal(r.place)}</span>
              <span className="standing-name">{r.name}{r.isHero ? " (you)" : ""}</span>
              <span className="standing-chips">{r.out ? "OUT" : formatChips(r.chips)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
