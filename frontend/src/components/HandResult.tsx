import { HandReview, formatChips } from "../models/game";

interface HandResultProps {
  review: HandReview;
  username?: string | null;
  onReview: () => void;
  onNext: () => void;
  countdown: number | null;
  paused: boolean;
  /** Phase 7: when false, the WON/LOST/CHOPPED text label is replaced by a
   * glyph + chips delta (banner colour is not the only signal; aria-label
   * keeps it accessible). */
  showResultLabels?: boolean;
}

function resultMeta(review: HandReview) {
  const net = review.heroNet;
  const won = review.heroWon && !review.chop;
  const lost = !review.heroWon && !review.chop && net < 0;
  const title = review.chop ? "CHOPPED" : review.heroWon ? "YOU WON" : net === 0 ? "NO CHANGE" : "YOU LOST";
  const subtitle = review.chop
    ? `${net >= 0 ? "+" : "-"}${formatChips(Math.abs(net))} chips`
    : review.heroWon
      ? `+${formatChips(net)} chips`
      : net < 0
        ? `-${formatChips(-net)} chips`
        : "You folded without risking chips";
  const glyph = review.chop ? "\u21c4" : won ? "\u2713" : lost ? "\u2715" : "\u25fc";
  return { title, subtitle, glyph };
}

/** Compact post-hand result (A10/A16): stays on the table, never auto-opens
 * the detailed history. The player chooses REVIEW THE HAND or NEXT HAND. */
export function HandResult({ review, username, onReview, onNext, countdown, paused, showResultLabels = true }: HandResultProps) {
  const { title, subtitle, glyph } = resultMeta(review);

  return (
    <div className="hand-result" data-testid="hand-result" role="status" aria-label={`${title}, ${subtitle}`}>
      <div className={`result-banner result-${title.toLowerCase().replace(" ", "-")}`}>
        <div className="result-title" data-testid="hand-result-title">
          {showResultLabels ? title : glyph}
        </div>
        {username && <div className="result-username">{username}</div>}
        <div className="result-subtitle" data-testid="hand-result-subtitle">{subtitle}</div>
      </div>
      <div className="result-meta">
        <span>HAND #{review.handNumber}</span>
        <span>POT {formatChips(review.pot)}</span>
        <span>STACK {formatChips(review.heroStart)} → {formatChips(review.heroEnd)}</span>
      </div>
      <div className="result-actions">
        <button className="btn btn-compact btn-primary" onClick={onReview} data-testid="review-hand-btn" aria-label="Review the hand">
          REVIEW HAND
        </button>
        <button className="btn btn-compact" onClick={onNext} data-testid="next-hand-btn" aria-label="Next hand">
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
