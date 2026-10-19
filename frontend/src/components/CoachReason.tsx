import { Fragment } from "react";
import type { Card } from "../models/game";

const ORDER = "23456789TJQKA";
const SUIT: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

/** The coach's shorthand for two cards: 8h 3c -> "83o", Ks Qs -> "KQs", 9d 9c -> "99". */
export function handClass(cards: Card[]): string | null {
  if (cards.length !== 2) return null;
  const [hi, lo] = [...cards].sort((a, b) => ORDER.indexOf(b.rank) - ORDER.indexOf(a.rank));
  if (hi.rank === lo.rank) return hi.rank + lo.rank;
  return hi.rank + lo.rank + (hi.suit === lo.suit ? "s" : "o");
}

/** The cards as small white chips, red for hearts and diamonds (the My Mistakes style). */
export function CardChips({ cards }: { cards: Card[] }) {
  return (
    <span className="reason-cards" data-testid="reason-cards">
      {cards.map((c, i) => (
        <span key={i} className={c.suit === "h" || c.suit === "d" ? "mistake-card mistake-card-red" : "mistake-card"}>
          {c.rank}{SUIT[c.suit] ?? c.suit}
        </span>
      ))}
    </span>
  );
}

/** The coach's reason with the hero's hand shown as their two cards instead of
 * the shorthand: "83o is not in the LJ open range" reads 8♥ 3♣ (the owner, 19
 * Oct). Only the hero's own shorthand is replaced, as a whole word, so a
 * number such as "45%" is never mistaken for a hand. */
export function CoachReason({ text, cards }: { text: string; cards?: Card[] | null }) {
  const name = cards ? handClass(cards) : null;
  if (!cards || !name) return <>{text}</>;
  const parts = text.split(new RegExp(`(?<![\\w.])${name}(?![\\w%])`));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <CardChips cards={cards} />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
