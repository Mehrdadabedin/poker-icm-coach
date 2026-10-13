import { HandReview, reviewResultMeta } from "../models/game";

interface HandResultProps {
  review: HandReview;
  onReview: () => void;
  onNext: () => void;
  countdown: number | null;
  paused: boolean;
  /** Phase 7: when false, the WON/LOST/CHOPPED text label is replaced by a
   * glyph + chips delta (banner colour is not the only signal; aria-label
   * keeps it accessible). */
  showResultLabels?: boolean;
}

/** Compact post-hand result (A10/A16, plan 071): one box in the result's
 * colour with the result, the chips and the countdown on the left and
 * REVIEW HAND / NEXT HAND on the right, so NEXT HAND is in view without
 * scrolling. The hand, pot and stack are on the table and in the review. */
export function HandResult({ review, onReview, onNext, countdown, paused, showResultLabels = true }: HandResultProps) {
  const { title, subtitle, glyph } = reviewResultMeta(review);

  return (
    <div className={`hand-result result-${title.toLowerCase().replace(" ", "-")}`} data-testid="hand-result"
      role="status" aria-label={`${title}, ${subtitle}`}>
      <div className="result-summary">
        <span className="result-title" data-testid="hand-result-title">{showResultLabels ? title : glyph}</span>
        <span className="result-subtitle" data-testid="hand-result-subtitle">{subtitle}</span>
        <span className="result-flow" data-testid="result-flow">
          {paused ? "PAUSED: study the hand" : `Next hand in ${countdown ?? "…"}`}
        </span>
      </div>
      <div className="result-actions">
        <button className="btn btn-compact btn-primary" onClick={onReview} data-testid="review-hand-btn" aria-label="Review the hand">
          REVIEW HAND
        </button>
        <button className="btn btn-compact" onClick={onNext} data-testid="next-hand-btn" aria-label="Next hand">
          NEXT HAND ▶
        </button>
      </div>
    </div>
  );
}
