import { ReviewShowdown } from "../models/game";
import { CardView } from "./CardView";

interface ShowdownHandsProps {
  showdown: ReviewShowdown[];
  foldedSeats: number[];
  nameBySeat: Map<number, string>;
}

/** Reveals at showdown: winners' cards + WON/LOST; folded players hidden. */
export function ShowdownHands({ showdown, foldedSeats, nameBySeat }: ShowdownHandsProps) {
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
            ) : (
              <div className="reveal-cards reveal-hidden">Walk — hand not revealed</div>
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
            <div className="reveal-cards reveal-hidden">Folded — hand not revealed</div>
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
