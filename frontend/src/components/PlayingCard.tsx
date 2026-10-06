import { Card, cardAlt } from "../models/game";
import { useDisplayPreferences } from "../services/preferences";

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  className?: string;
}

/** Renders a real playing-card image asset (A17, OpenDecks CC0). The full
 * 52-card deck plus the back is bundled locally in /public/cards as PNG
 * (crisp at any display size) — no remote URLs, no emoji, no plain-text
 * cards. The card identity comes from {rank,suit} in game state, mapped
 * deterministically to the file. PNG is the only format installed: see
 * ARCHITECTURE.md section 6. */
function cardAssetUrl(card: Card): string {
  return `${import.meta.env.BASE_URL}cards/${card.rank}${card.suit}.png`;
}

const BACK_FILE = { blue: "back.png", red: "back-red.png" } as const;

/** A face-down card in the player's chosen back (Settings: Card back). */
function CardBackImage({ className }: { className: string }) {
  const { cardBack } = useDisplayPreferences();
  return (
    <img
      src={`${import.meta.env.BASE_URL}cards/${BACK_FILE[cardBack]}`}
      alt="face down card"
      className={`playing-card ${className}`.trim()}
      data-testid="card-back"
      data-back={cardBack}
      draggable={false}
    />
  );
}

export function PlayingCard({ card, faceDown = false, className = "" }: PlayingCardProps) {
  if (faceDown || !card) return <CardBackImage className={className} />;
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
