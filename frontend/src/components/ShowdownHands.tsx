import { ReviewShowdown } from "../models/game";
import { CardView } from "./CardView";
import { PlayingCard } from "./PlayingCard";

interface ShowdownHandsProps {
  showdown: ReviewShowdown[];
  foldedSeats: number[];
  nameBySeat: Map<number, string>;
  heroSeat: number;
}

/** A mucked opponent hand: two backs, never fake faces. */
function MuckedCards({ label }: { label: string }) {
  return (
    <div className="reveal-cards reveal-mucked" role="img" aria-label={label} data-testid="mucked-cards">
      <PlayingCard faceDown className="card-small" />
      <PlayingCard faceDown className="card-small" />
    </div>
  );
}

/** Reveals at showdown: winners' cards + WON/LOST; mucked opponent hands
 * (folded, or a walk nobody had to show) as card backs. */
export function ShowdownHands({ showdown, foldedSeats, nameBySeat, heroSeat }: ShowdownHandsProps) {
  return (
    <div className="reveal-section" data-testid="reveal-section">
      <h3>SHOWDOWN HANDS</h3>
      <div className="reveal-list">
        {showdown.map((s) => (
          <div key={s.seat} className={`reveal-player ${s.isHero ? "reveal-hero" : ""} ${s.won ? "reveal-won" : ""}`}>
            <div className="reveal-name">
              {s.name}
              {s.isHero ? " (You)" : ""}
            </div>
            {s.cards.length === 2 ? (
              <div className="reveal-cards">
                {s.cards.map((c, i) => (
                  <CardView key={i} card={c} small />
                ))}
              </div>
            ) : s.isHero ? (
              <div className="reveal-cards reveal-hidden">Walk — hand not revealed</div>
            ) : (
              <MuckedCards label="Walk — hand not revealed" />
            )}
            <div className="reveal-hand">{s.handName ?? "No showdown"}</div>
            <div className={`reveal-result ${s.won ? "reveal-won-label" : "reveal-lost-label"}`}>
              {s.won ? "WON" : "LOST"}
            </div>
          </div>
        ))}
        {foldedSeats.map((seat) => (
          <div key={seat} className="reveal-player reveal-folded">
            <div className="reveal-name">{nameBySeat.get(seat) ?? `Seat ${seat}`}</div>
            {seat === heroSeat
              ? <div className="reveal-cards reveal-hidden">Folded — hand not revealed</div>
              : <MuckedCards label="Folded — hand not revealed" />}
            <div className="reveal-hand">FOLDED</div>
          </div>
        ))}
        {showdown.length === 0 && foldedSeats.length === 0 && (
          <div className="reveal-empty">No showdown this hand.</div>
        )}
      </div>
    </div>
  );
}
