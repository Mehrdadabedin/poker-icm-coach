import { HandReview, formatChips } from "../models/game";

interface HandResultProps {
  review: HandReview;
  username?: string | null;
  onReview: () => void;
  onNext: () => void;
  countdown: number | null;
  paused: boolean;
}

/** Compact post-hand result (A10/A16): stays on the table, never auto-opens
 * the detailed history. The player chooses REVIEW THE HAND or NEXT HAND. */
export function HandResult({ review, username, onReview, onNext, countdown, paused }: HandResultProps) {
  const net = review.heroNet;
  const title = review.chop ? "CHOPPED" : review.heroWon ? "YOU WON" : net === 0 ? "NO CHANGE" : "YOU LOST";
  const subtitle = review.chop
    ? `${net >= 0 ? "+" : "-"}${formatChips(Math.abs(net))} chips`
    : review.heroWon
      ? `+${formatChips(net)} chips`
      : net < 0
        ? `-${formatChips(-net)} chips`
        : "You folded without risking chips";

  return (
    <div className="hand-result" data-testid="hand-result">
      <div className={`result-banner result-${title.toLowerCase().replace(" ", "-")}`}>
        <div className="result-title" data-testid="hand-result-title">{title}</div>
        {username && <div className="result-username">{username}</div>}
        <div className="result-subtitle" data-testid="hand-result-subtitle">{subtitle}</div>
      </div>
      <div className="result-meta">
        <span>HAND #{review.handNumber}</span>
        <span>POT {formatChips(review.pot)}</span>
        <span>STACK {formatChips(review.heroStart)} → {formatChips(review.heroEnd)}</span>
      </div>
      <div className="result-actions">
        <button className="btn btn-primary" onClick={onReview} data-testid="review-hand-btn">
          REVIEW THE HAND
        </button>
        <button className="btn" onClick={onNext} data-testid="next-hand-btn">
          NEXT HAND ▶
        </button>
      </div>
      <div className="result-flow" data-testid="result-flow">
        {paused ? (
          <span className="flow-paused">PAUSED — study the hand</span>
        ) : (
          <span className="flow-countdown">NEXT HAND IN {countdown ?? "…"}</span>
        )}
      </div>
    </div>
  );
}
