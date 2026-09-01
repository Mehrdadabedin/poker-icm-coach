import { useEffect, useState } from "react";
import { Card } from "../models/game";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["s", "h", "d", "c"] as const;
const SUIT_SYMBOL: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function cardEquals(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

interface CardPickerProps {
  value: Card | null;
  label: string;
  used: Card[]; // cards already selected elsewhere to prevent duplicates
  onChange: (card: Card | null) => void;
  resetAfterPick?: boolean; // add-mode: clear the picker after committing a card
}

/** A rank+suit card selector that only commits once both are chosen. */
export function CardPicker({ value, label, used, onChange, resetAfterPick = false }: CardPickerProps) {
  const [rank, setRank] = useState("");
  const [suit, setSuit] = useState("");

  useEffect(() => {
    setRank(value?.rank ?? "");
    setSuit(value?.suit ?? "");
  }, [value]);

  const usedKeys = new Set(used.map(cardKey));

  const commit = (r: string, s: string) => {
    if (!r || !s) return;
    const candidate = { rank: r, suit: s as Card["suit"] };
    if (usedKeys.has(cardKey(candidate))) return; // duplicate physical card
    onChange(candidate);
    if (resetAfterPick) {
      setRank("");
      setSuit("");
    }
  };

  return (
    <div className="card-picker" data-testid={`picker-${label.toLowerCase().replace(/\W+/g, "-")}`}>
      <span className="picker-label">{label}</span>
      <select
        value={rank}
        onChange={(e) => { setRank(e.target.value); commit(e.target.value, suit); }}
        data-testid={`${label.toLowerCase().replace(/\W+/g, "-")}-rank`}
      >
        <option value="" disabled>Rank</option>
        {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select
        value={suit}
        onChange={(e) => { setSuit(e.target.value); commit(rank, e.target.value); }}
        data-testid={`${label.toLowerCase().replace(/\W+/g, "-")}-suit`}
      >
        <option value="" disabled>Suit</option>
        {SUITS.map((s) => {
          const blocked = rank !== "" && usedKeys.has(cardKey({ rank, suit: s }));
          return (
            <option key={s} value={s} disabled={blocked}>
              {blocked ? `${SUIT_SYMBOL[s]} *` : SUIT_SYMBOL[s]}
            </option>
          );
        })}
      </select>
      {value && (
        <button className="btn btn-small picker-clear" onClick={() => onChange(null)} title="Remove card">✕</button>
      )}
    </div>
  );
}

export { RANKS, SUITS, SUIT_SYMBOL };
