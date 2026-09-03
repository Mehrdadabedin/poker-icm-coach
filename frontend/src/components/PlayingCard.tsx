import { Card, cardFace } from "../models/game";

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  className?: string;
}

/** Renders a real playing-card image asset (A08). 52 SVG cards + a card
 * back are bundled locally in /public/cards — no remote URLs, no emoji, no
 * plain-text cards. The card identity comes from {rank,suit} in game state,
 * mapped deterministically to the matching asset file. */
export function cardAssetUrl(card: Card): string {
  return `${import.meta.env.BASE_URL}cards/${card.rank}${card.suit}.svg`;
}

export function PlayingCard({ card, faceDown = false, className = "" }: PlayingCardProps) {
  if (faceDown || !card) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}cards/back.svg`}
        alt="face down card"
        className={`playing-card ${className}`.trim()}
        data-testid="card-back"
        draggable={false}
      />
    );
  }
  return (
    <img
      src={cardAssetUrl(card)}
      alt={cardFace(card)}
      className={`playing-card ${className}`.trim()}
      data-testid={`card-${card.rank}${card.suit}`}
      draggable={false}
    />
  );
}
