import { useState } from "react";
import { CoachAdvice, HandReview as ReviewData, formatChips, reviewResultMeta } from "../models/game";
import { ActionHistory } from "./ActionHistory";
import { BotExplanations } from "./BotExplanations";
import { CardView } from "./CardView";
import { CoachPanelView } from "./CoachPanelView";
import { ShowdownHands } from "./ShowdownHands";

interface HandReviewProps {
  review: ReviewData;
  coach: CoachAdvice | null;
  comparison: Record<string, string> | null;
  totalPlayers: number;
  nameBySeat: Map<number, string>;
  onBack?: () => void;
}

/** Post-hand review ("Poker Hand History"): result, facts, showdown, actions,
 * bot explanations and coaching. Opens ONLY via "Review the Hand" (A10/A16);
 * read-only — never mutates game state. Back to Table returns to the live
 * table without advancing the hand. */
export function HandReview({ review, coach, comparison, totalPlayers, nameBySeat, onBack }: HandReviewProps) {
  const [showCoach, setShowCoach] = useState(true);
  const net = review.heroNet;
  const { title, subtitle } = reviewResultMeta(review);

  return (
    <div className="hand-review" data-testid="hand-review">
      <div className="review-heading-row">
        <h2 className="review-heading" data-testid="hand-history-title">POKER HAND HISTORY</h2>
        <span className="review-hand-no">HAND #{review.handNumber}</span>
      </div>

      <div className={`result-banner result-${title.toLowerCase().replace(" ", "-")}`} data-testid="result-banner">
        <div className="result-title">{title}</div>
        <div className="result-subtitle">{subtitle}</div>
      </div>

      <div className="result-grid" data-testid="result-grid">
        <div className="result-cell">
          <dt>WINNING HAND</dt>
          <dd>{review.winningHandName ?? "Uncontested"}</dd>
        </div>
        <div className="result-cell">
          <dt>YOUR HAND</dt>
          <dd>{review.heroHandName ?? "Folded — not shown"}</dd>
        </div>
        <div className="result-cell result-cards-cell">
          <dt>HERO CARDS</dt>
          <dd>
            {review.heroCards.length === 2 ? (
              review.heroCards.map((c, i) => <CardView key={i} card={c} small />)
            ) : (
              <span className="board-na">—</span>
            )}
          </dd>
        </div>
        <div className="result-cell result-board-cell">
          <dt>FINAL BOARD</dt>
          <dd>
            {review.board.length === 0 ? (
              <span className="board-na">—</span>
            ) : (
              review.board.map((c, i) => <CardView key={i} card={c} small />)
            )}
          </dd>
        </div>
        <div className="result-cell">
          <dt>POT</dt>
          <dd>{formatChips(review.pot)}</dd>
        </div>
        <div className="result-cell">
          <dt>YOUR STACK</dt>
          <dd>
            {formatChips(review.heroStart)} → {formatChips(review.heroEnd)}
          </dd>
        </div>
        <div className="result-cell">
          <dt>CHIP CHANGE</dt>
          <dd className={net > 0 ? "pos" : net < 0 ? "neg" : ""}>
            {net > 0 ? `+${formatChips(net)}` : net < 0 ? `-${formatChips(-net)}` : "±0"}
          </dd>
        </div>
        <div className="result-cell">
          <dt>YOUR POSITION</dt>
          <dd>{review.heroPosition}</dd>
        </div>
        <div className="result-cell">
          <dt>STACK RANK</dt>
          <dd>
            {review.heroRankBefore}/{totalPlayers} → {review.heroRankAfter}/{totalPlayers}
          </dd>
        </div>
        <div className="result-cell">
          <dt>ICM PRESSURE</dt>
          <dd>{review.pressure}</dd>
        </div>
      </div>

      <ShowdownHands
        showdown={review.showdown}
        foldedSeats={review.foldedSeats}
        nameBySeat={nameBySeat}
      />

      <div className="review-history-block">
        <h3>BOT ACTION HISTORY</h3>
        <ActionHistory actions={review.actions} heroSeat={review.heroSeat} nameBySeat={nameBySeat} />
      </div>

      <BotExplanations explanations={review.explanations} />

      {(coach || comparison) && (
        <div className="review-coach" data-testid="review-coach">
          <button className="coach-toggle" onClick={() => setShowCoach((v) => !v)}>
            {showCoach ? "HIDE HERO COACHING" : "SHOW HERO COACHING"}
          </button>
          {showCoach && (
            <>
              {comparison && (
                <div className="comparison-box" data-testid="comparison">
                  <b>{comparison.grade}</b> — {comparison.explanation}
                </div>
              )}
              {coach && <CoachPanelView coach={coach} testId="review-coach-panel" />}
            </>
          )}
        </div>
      )}

      <div className="review-flow" data-testid="review-flow">
        {onBack && (
          <button className="btn btn-primary" onClick={onBack} data-testid="back-to-table-btn">
            BACK TO TABLE
          </button>
        )}
        <span className="flow-hint">Review is read-only — it never advances the hand or the clock.</span>
      </div>
    </div>
  );
}
