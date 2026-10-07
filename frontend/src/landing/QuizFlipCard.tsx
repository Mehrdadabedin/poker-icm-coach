interface QuizFlipCardProps {
  face: string;
  alt: string;
  flipped: boolean;
  onFlip: () => void;
}

/** A47 — one two-sided playing-card flip for the TRY ONE SPOT hand.
 *
 * The back face is the red brand back (decorative, aria-hidden) and the
 * front face is the card face, pre-rotated 180deg. The inner element
 * rotates rotateY(180deg) over 0.7s (perspective comes from the hand), so
 * the front is only seen once the turn completes. A face-down card flips
 * immediately on click or Enter/Space. */
export function QuizFlipCard({ face, alt, flipped, onFlip }: QuizFlipCardProps) {
  return (
    <div
      className={`lp-flip-card${flipped ? " lp-flip-card-up" : ""}`}
      data-testid={`quiz-flip-${alt.split(" ")[0].toLowerCase()}`}
      role="button"
      tabIndex={0}
      aria-label={flipped ? alt : "Face-down card"}
      onClick={() => onFlip()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <div className="lp-flip-inner">
        <img
          className="lp-flip-face lp-flip-back"
          src="/cards/back-red.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <img className="lp-flip-face lp-flip-front" src={face} alt={alt} draggable={false} />
      </div>
    </div>
  );
}
