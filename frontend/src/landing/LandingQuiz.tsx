import { useState } from "react";
import { LANDING_QUIZ_FACTS, LANDING_SPOT } from "./landingQuizData";

/** A47 — TRY ONE SPOT: the pinned coach quiz. Both CALL and FOLD reveal the
 * same backend-computed answer (source: backend/tests/test_landing_spot.py):
 * the coach's action, the ICM pressure and a plain explanation, plus whether
 * the visitor's pick matched the coach. */
export function LandingQuiz() {
  const [chosen, setChosen] = useState<"call" | "fold" | null>(null);
  const facts = LANDING_QUIZ_FACTS;
  const picked = (name: "call" | "fold") => () => setChosen(name);
  const matched = chosen === facts.recommendedAction.toLowerCase();

  return (
    <section className="lp-section lp-band-soft" id="lp-quiz" aria-labelledby="lp-quiz-title" data-testid="landing-quiz">
      <div className="lp-inner lp-narrow">
        <h2 className="lp-section-title" id="lp-quiz-title">Try one spot</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-quiz-card" data-testid="landing-quiz-card">
          <div className="lp-quiz-hand">
            <img className="lp-quiz-card-img" src="/cards/Ks.png" alt="King of spades" />
            <img className="lp-quiz-card-img" src="/cards/Jh.png" alt="Jack of hearts" />
          </div>
          <ul className="lp-quiz-spot">
            {LANDING_SPOT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="lp-quiz-prompt">What would you do?</p>
          <div className="lp-quiz-actions">
            <button type="button" className="lp-btn lp-btn-quiz-quiet" onClick={picked("call")} data-testid="landing-quiz-call">
              CALL
            </button>
            <button type="button" className="lp-btn lp-btn-quiz-quiet" onClick={picked("fold")} data-testid="landing-quiz-fold">
              FOLD
            </button>
          </div>
          {chosen && (
            <div className="lp-quiz-answer" data-testid="landing-quiz-answer" role="status">
              <p className="lp-quiz-verdict">
                The coach says <b>{facts.recommendedAction}</b>
                <span className="lp-quiz-pressure">ICM pressure {facts.icmPressure}</span>
              </p>
              <p className="lp-quiz-reason">{facts.explanation}</p>
              <p className="lp-quiz-match">
                {matched
                  ? `You picked ${facts.recommendedAction} — matches the coach.`
                  : `You picked ${chosen === "call" ? "CALL" : "FOLD"} — the coach ${facts.recommendedAction.toLowerCase()}s.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
