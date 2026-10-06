import { useEffect, useRef, useState } from "react";
import { LANDING_QUIZ_FACTS, LANDING_SPOT } from "./landingQuizData";
import { QuizFlipCard } from "./QuizFlipCard";

/** A47 — TRY ONE SPOT: the pinned coach quiz. Both CALL and FOLD reveal the
 * same backend-computed answer (source: backend/tests/test_landing_spot.py).
 * The hole cards show the red brand back and turn over to K♠ J♥ when the
 * whole hand is visible: the King after 800ms, the Jack 250ms later, once.
 * Without IntersectionObserver (tests) the faces render up as before. */
const QUIZ_CARDS = [
  { face: "/cards/Ks.png", alt: "King of spades", delay: 800 },
  { face: "/cards/Jh.png", alt: "Jack of hearts", delay: 1050 },
];

export function LandingQuiz() {
  const [chosen, setChosen] = useState<"call" | "fold" | null>(null);
  const [faceUp, setFaceUp] = useState<readonly [boolean, boolean]>([false, false]);
  const startedRef = useRef(false);
  const facts = LANDING_QUIZ_FACTS;
  const picked = (name: "call" | "fold") => () => setChosen(name);
  const matched = chosen === facts.recommendedAction.toLowerCase();
  const turn = (index: 0 | 1) => () => {
    setFaceUp((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      return next as [boolean, boolean];
    });
  };

  useEffect(() => {
    // Preload both faces and the back so turning never shows a blank frame.
    for (const src of [QUIZ_CARDS[0].face, QUIZ_CARDS[1].face, "/cards/back-red.png"]) {
      const image = new Image();
      image.src = src;
    }
    const showFaces = () => setFaceUp([true, true]);
    if (typeof IntersectionObserver === "undefined") {
      showFaces();
      return;
    }
    const hand = document.querySelector('[data-testid="landing-quiz-hand"]');
    if (!hand) {
      showFaces();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || startedRef.current) return;
        startedRef.current = true;
        window.setTimeout(() => turn(0)(), QUIZ_CARDS[0].delay);
        window.setTimeout(() => turn(1)(), QUIZ_CARDS[1].delay);
        observer.disconnect();
      },
      { threshold: 1.0 },
    );
    observer.observe(hand);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="lp-section lp-band-soft" id="lp-quiz" aria-labelledby="lp-quiz-title" data-testid="landing-quiz">
      <div className="lp-inner lp-narrow">
        <h2 className="lp-section-title" id="lp-quiz-title">Try one spot</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-quiz-card" data-testid="landing-quiz-card">
          <div className="lp-quiz-hand" data-testid="landing-quiz-hand">
            {QUIZ_CARDS.map((card, i) => (
              <QuizFlipCard
                key={card.face}
                face={card.face}
                alt={card.alt}
                flipped={faceUp[i as 0 | 1]}
                onFlip={turn(i as 0 | 1)}
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
