import { PlayerView, formatChips } from "../models/game";
import { CardView } from "./CardView";

interface PokerSeatProps {
  player: PlayerView;
  active: boolean;
}

/** One seat on the poker table: stack, position, bet, cards, indicators. */
export function PokerSeat({ player, active }: PokerSeatProps) {
  const classes = [
    "seat",
    player.isHero ? "seat-hero" : "",
    active ? "seat-active" : "",
    player.folded ? "seat-folded" : "",
    player.sitsOut ? "seat-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid={`seat-${player.seat}`} data-active={active}>
      {player.isDealer && (
        <span className="dealer-button" data-testid={`dealer-${player.seat}`}>
          D
        </span>
      )}
      <div className="seat-position">
        {player.position} {player.position === "SB" || player.position === "BB" ? "•" : ""}
      </div>
      <div className="seat-name">{player.name}</div>
      {player.sitsOut ? (
        <div className="seat-out-label">OUT</div>
      ) : (
        <>
          <div className="seat-stack">
            {formatChips(player.stack)} <span className="seat-bb">({player.stackInBB} BB)</span>
          </div>
          {player.holeCards && player.holeCards.length === 2 && (
            <div className="seat-cards">
              {player.holeCards.map((c, i) => (
                <CardView key={i} card={c} small />
              ))}
            </div>
          )}
        </>
      )}
      {player.bet > 0 && !player.folded && (
        <div className="seat-bet" data-testid={`bet-${player.seat}`}>
          {formatChips(player.bet)}
        </div>
      )}
      {player.folded && <div className="seat-fold-label">FOLD</div>}
    </div>
  );
}
