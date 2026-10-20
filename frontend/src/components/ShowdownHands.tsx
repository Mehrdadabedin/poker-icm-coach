import { ReviewShowdown } from "../models/game";
import { CardView } from "./CardView";
import { PlayingCard } from "./PlayingCard";
import { useT } from "../i18n/I18n";

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
  const t = useT();
  return (
    <div className="reveal-section" data-testid="reveal-section">
      <h3>{t("showdown.title")}</h3>
      <div className="reveal-list">
        {showdown.map((s) => (
          <div key={s.seat} className={`reveal-player ${s.isHero ? "reveal-hero" : ""} ${s.won ? "reveal-won" : ""}`}>
            <div className="reveal-name">
              {s.name}
              {s.isHero ? t("showdown.you") : ""}
            </div>
            {s.cards.length === 2 ? (
              <div className="reveal-cards">
                {s.cards.map((c, i) => (
                  <CardView key={i} card={c} small />
                ))}
              </div>
            ) : s.isHero ? (
              <div className="reveal-cards reveal-hidden">{t("showdown.walk")}</div>
            ) : (
              <MuckedCards label={t("showdown.walk")} />
            )}
            <div className="reveal-hand">{s.handName ?? t("showdown.noShowdown")}</div>
            <div className={`reveal-result ${s.won ? "reveal-won-label" : "reveal-lost-label"}`}>
              {t(s.won ? "seat.won" : "seat.lost")}
            </div>
          </div>
        ))}
        {foldedSeats.map((seat) => (
          <div key={seat} className="reveal-player reveal-folded">
            <div className="reveal-name">{nameBySeat.get(seat) ?? t("showdown.seat", { n: seat })}</div>
            {seat === heroSeat
              ? <div className="reveal-cards reveal-hidden">{t("showdown.foldedHidden")}</div>
              : <MuckedCards label={t("showdown.foldedHidden")} />}
            <div className="reveal-hand">{t("seat.folded")}</div>
          </div>
        ))}
        {showdown.length === 0 && foldedSeats.length === 0 && (
          <div className="reveal-empty">{t("showdown.empty")}</div>
        )}
      </div>
    </div>
  );
}
