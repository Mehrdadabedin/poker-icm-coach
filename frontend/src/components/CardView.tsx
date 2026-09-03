import { Card } from "../models/game";
import { PlayingCard } from "./PlayingCard";

interface CardViewProps {
  card: Card;
  faceDown?: boolean;
  small?: boolean;
}

/** Backwards-compatible wrapper around the real playing-card assets.
 * `small` keeps the existing seat-size variants; hero/board cards use the
 * new larger sizing (A09). */
export function CardView({ card, faceDown = false, small = false }: CardViewProps) {
  return (
    <PlayingCard
      card={faceDown ? undefined : card}
      faceDown={faceDown}
      className={small ? "card-small" : ""}
    />
  );
}
