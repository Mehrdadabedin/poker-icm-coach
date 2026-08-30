import { Card, cardColor, cardFace, cardSymbol } from "../models/game";

interface CardViewProps {
  card: Card;
  faceDown?: boolean;
  small?: boolean;
}

/** A single playing card; faceDown renders the card back. */
export function CardView({ card, faceDown = false, small = false }: CardViewProps) {
  if (faceDown) {
    return (
      <div className={`card card-back ${small ? "card-small" : ""}`} aria-label="face down card" />
    );
  }
  return (
    <div
      className={`card card-${cardColor(card.suit)} ${small ? "card-small" : ""}`}
      data-testid={`card-${card.rank}${card.suit}`}
      aria-label={cardFace(card)}
    >
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{cardSymbol[card.suit]}</span>
    </div>
  );
}
