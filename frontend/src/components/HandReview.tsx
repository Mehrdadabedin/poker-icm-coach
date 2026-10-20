import { useState } from "react";
import { CoachAdvice, HandReview as ReviewData, formatChips } from "../models/game";
import { RESULT_CLASS, reviewResultMeta } from "../models/handResult";
import { ActionHistory } from "./ActionHistory";
import { BotExplanations } from "./BotExplanations";
import { CardView } from "./CardView";
import { CoachPanelView } from "./CoachPanelView";
import { ShowdownHands } from "./ShowdownHands";
import { useT } from "../i18n/I18n";
import { PRESSURE_KEY } from "../i18n/poker";
import { gradeLine } from "../i18n/coach";
import { handName } from "../i18n/review";

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
  const t = useT();
  const [showCoach, setShowCoach] = useState(true);
  const net = review.heroNet;
  const { kind, title, subtitle } = reviewResultMeta(review, t);
  const pressure = PRESSURE_KEY[review.pressure.toUpperCase()];

  return (
    <div className="hand-review" data-testid="hand-review">
      <div className="review-heading-row">
        <h2 className="review-heading" data-testid="hand-history-title">{t("review.title")}</h2>
        <span className="review-hand-no">{t("status.hand", { n: review.handNumber })}</span>
      </div>

      <div className={`result-banner ${RESULT_CLASS[kind]}`} data-testid="result-banner">
        <div className="result-title">{title}</div>
        <div className="result-subtitle">{subtitle}</div>
      </div>

      <div className="result-grid" data-testid="result-grid">
        <div className="result-cell">
          <dt>{t("review.winningHand")}</dt>
          <dd>{review.winningHandName ? handName(review.winningHandName, t) : t("review.uncontested")}</dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.yourHand")}</dt>
          <dd>{review.heroHandName ? handName(review.heroHandName, t) : t("review.foldedHidden")}</dd>
        </div>
        <div className="result-cell result-cards-cell">
          <dt>{t("review.heroCards")}</dt>
          <dd>
            {review.heroCards.length === 2 ? (
              review.heroCards.map((c, i) => <CardView key={i} card={c} small />)
            ) : (
              <span className="board-na">—</span>
            )}
          </dd>
        </div>
        <div className="result-cell result-board-cell">
          <dt>{t("review.finalBoard")}</dt>
          <dd>
            {review.board.length === 0 ? (
              <span className="board-na">—</span>
            ) : (
              review.board.map((c, i) => <CardView key={i} card={c} small />)
            )}
          </dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.pot")}</dt>
          <dd>{formatChips(review.pot)}</dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.yourStack")}</dt>
          <dd>
            {formatChips(review.heroStart)} → {formatChips(review.heroEnd)}
          </dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.chipChange")}</dt>
          <dd className={net > 0 ? "pos" : net < 0 ? "neg" : ""}>
            {net > 0 ? `+${formatChips(net)}` : net < 0 ? `-${formatChips(-net)}` : "±0"}
          </dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.yourPosition")}</dt>
          <dd>{review.heroPosition}</dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.stackRank")}</dt>
          <dd>
            {review.heroRankBefore}/{totalPlayers} → {review.heroRankAfter}/{totalPlayers}
          </dd>
        </div>
        <div className="result-cell">
          <dt>{t("review.icmPressure")}</dt>
          <dd>{pressure ? t(pressure) : review.pressure}</dd>
        </div>
      </div>

      <ShowdownHands
        showdown={review.showdown}
        foldedSeats={review.foldedSeats}
        nameBySeat={nameBySeat}
        heroSeat={review.heroSeat}
      />

      <div className="review-history-block">
        <h3>{t("review.botHistory")}</h3>
        <ActionHistory actions={review.actions} heroSeat={review.heroSeat} nameBySeat={nameBySeat} />
      </div>

      <BotExplanations explanations={review.explanations} />

      {(coach || comparison) && (
        <div className="review-coach" data-testid="review-coach">
          <button className="coach-toggle" onClick={() => setShowCoach((v) => !v)}>
            {t(showCoach ? "review.hideCoaching" : "review.showCoaching")}
          </button>
          {showCoach && (
            <>
              {comparison && (
                <div className="comparison-box" data-testid="comparison">
                  <b>{gradeLine(comparison, t).grade}</b> — {gradeLine(comparison, t).text}
                </div>
              )}
              {coach && <CoachPanelView coach={coach} testId="review-coach-panel" heroCards={review.heroCards} />}
            </>
          )}
        </div>
      )}

      <div className="review-flow" data-testid="review-flow">
        {onBack && (
          <button className="btn btn-primary" onClick={onBack} data-testid="back-to-table-btn">
            {t("review.back")}
          </button>
        )}
        <span className="flow-hint">{t("review.readOnly")}</span>
      </div>
    </div>
  );
}
