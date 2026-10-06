import { useEffect, useState } from "react";
import { LANDING_QUIZ_FACTS, LANDING_SPOT } from "./landingQuizData";

/** A47 — TRY ONE SPOT: the pinned coach quiz. Both CALL and FOLD reveal the
 * same backend-computed answer (source: backend/tests/test_landing_spot.py):
 * the coach's action, the ICM pressure and a plain explanation, plus whether
 * the visitor's pick matched the coach. The hole cards start face down
 * (cards/back.png) and flip when the section scrolls into view. */
const QUIZ_CARDS = [
  { face: "/cards/Ks.png", alt: "King of spades" },
  { face: "/cards/Jh.png", alt: "Jack of hearts" },
];

export function LandingQuiz() {
  const [chosen, setChosen] = useState<"call" | "fold" | null>(null);
  const [faceUp, setFaceUp] = useState(false);
  const facts = LANDING_QUIZ_FACTS;
  const picked = (name: "call" | "fold") => () => setChosen(name);
  const matched = chosen === facts.recommendedAction.toLowerCase();

  useEffect(() => {
    // Flip the cards when the quiz scrolls into view; without an observer
    // (tests) flip immediately so the faces are rendered as before.
    if (typeof IntersectionObserver === "undefined") {
      setFaceUp(true);
      return;
    }
    const quiz = document.getElementById("lp-quiz");
    if (!quiz) {
      setFaceUp(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setFaceUp(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(quiz);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="lp-section lp-band-soft" id="lp-quiz" aria-labelledby="lp-quiz-title" data-testid="landing-quiz">
      <div className="lp-inner lp-narrow">
        <h2 className="lp-section-title" id="lp-quiz-title">Try one spot</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-quiz-card" data-testid="landing-quiz-card">
          <div className="lp-quiz-hand" data-testid="landing-quiz-hand">
            {QUIZ_CARDS.map((card) => (
              <img
                key={card.face}
                className={`lp-quiz-card-img ${faceUp ? "lp-quiz-card-up" : ""}`}
                src={faceUp ? card.face : "/cards/back.png"}
                alt={card.alt}
              />
            ))}
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
