import { Card, cardAlt } from "../models/game";

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  className?: string;
}

/** Renders a real playing-card image asset (A17, OpenDecks CC0). The full
 * 52-card deck is bundled locally in /public/cards in PNG and SVG; the
 * production renderer uses the PNG assets (crisp at any display size) —
 * no remote URLs, no emoji, no plain-text cards. The card identity comes
 * from {rank,suit} in game state, mapped deterministically to the file. */
export function cardAssetUrl(card: Card): string {
  return `${import.meta.env.BASE_URL}cards/${card.rank}${card.suit}.png`;
}

export function PlayingCard({ card, faceDown = false, className = "" }: PlayingCardProps) {
  if (faceDown || !card) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}cards/back.png`}
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
      alt={cardAlt(card)}
      className={`playing-card ${className}`.trim()}
      data-testid={`card-${card.rank}${card.suit}`}
      draggable={false}
    />
  );
}
