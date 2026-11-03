import { useState } from "react";
import { PlayingCard } from "./PlayingCard";
import { useT } from "../i18n/I18n";
import type { Card } from "../models/game";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** The two cards as one button (plan 110). A tap or a click turns both over
 * together, a tap and not a hover so it works on a phone. With reduced motion
 * they appear face up at once. */
export function QuizCards({ cards, back, faceUp, onFlip }: { cards: Card[]; back: "red" | "blue"; faceUp: boolean; onFlip: () => void }) {
  const t = useT();
  const [instant] = useState(() => window.matchMedia?.(REDUCED).matches ?? false);
  const classes = ["quiz-cards", faceUp && "quiz-up", instant && "quiz-instant"].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} onClick={onFlip} disabled={faceUp} data-testid="quiz-cards"
      data-back={back} data-face-up={faceUp} aria-label={faceUp ? t("quiz.cards") : t("quiz.show")}>
      {cards.map((card, i) => (
        <span key={i} className="quiz-card">
          <span className="quiz-card-inner">
            <img className="quiz-face quiz-back" src={`${import.meta.env.BASE_URL}cards/quiz-back-${back}.png`}
              alt="" data-testid="quiz-back" draggable={false} />
            <span className="quiz-face quiz-front"><PlayingCard card={card} className="quiz-front-img" /></span>
          </span>
        </span>
      ))}
    </button>
  );
}
