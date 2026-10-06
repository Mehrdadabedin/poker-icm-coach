import { useState } from "react";
import { LANDING_QUIZ_FACTS, LANDING_SPOT } from "./landingQuizData";

/** A47 — TRY ONE SPOT: the pinned coach quiz. Both CALL and FOLD reveal the
 * same backend-computed answer (source: backend/tests/test_landing_spot.py). */
export function LandingQuiz() {
  const [chosen, setChosen] = useState<"call" | "fold" | null>(null);
  const facts = LANDING_QUIZ_FACTS;

  return (
    <section className="lp-section lp-band-soft" id="lp-quiz" aria-labelledby="lp-quiz-title" data-testid="landing-quiz">
      <div className="lp-inner lp-narrow">
        <h2 className="lp-section-title" id="lp-quiz-title">Try one spot</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-quiz-card" data-testid="landing-quiz-card">
          <div className="lp-quiz-hand">
            <img className="lp-quiz-card-img" src="/cards/Ah.png" alt="Ace of hearts" />
            <img className="lp-quiz-card-img" src="/cards/Qs.png" alt="Queen of spades" />
          </div>
          <p className="lp-quiz-spot">{LANDING_SPOT}</p>
          <p className="lp-quiz-prompt">What would you do?</p>
          <div className="lp-quiz-actions">
            <button
              type="button"
              className="lp-btn lp-btn-quiz-quiet"
              onClick={() => setChosen("call")}
              data-testid="landing-quiz-call"
            >
              CALL
            </button>
            <button
              type="button"
              className="lp-btn lp-btn-quiz-quiet"
              onClick={() => setChosen("fold")}
              data-testid="landing-quiz-fold"
            >
              FOLD
            </button>
          </div>
          {chosen && (
            <div className="lp-quiz-answer" data-testid="landing-quiz-answer" role="status">
              <p className="lp-quiz-verdict">
                The coach says <b>{facts.recommendedAction}</b> ·
                {(facts.confidence * 100).toFixed(0)}% confident
              </p>
              <p className="lp-quiz-reason">{facts.reasoning}</p>
              <dl className="lp-quiz-facts">
                {facts.factRows.map((row) => (
                  <div key={row.label} className="lp-quiz-fact">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="lp-quiz-note">
                Alternative: {facts.alternativeAction}. Same answer from the engine every time.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
