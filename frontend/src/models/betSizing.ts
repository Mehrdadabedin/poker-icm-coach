/* Bet sizing for the hero's controls: preset sizes that fit the street.
 * Preflop sizes are multiples of the big blind or of the raise faced;
 * after the flop they are shares of the pot. Amounts are "raise to" street
 * totals, as the engine expects, kept inside the legal minimum and maximum. */
import type { TableAction } from "./game";

export type Preset = { key: string; label: string; amount: number };

export type SizingInput = {
  street: string;
  toCall: number;
  pot: number;      // every chip in the middle, this street's bets included
  bigBlind: number;
  heroBet: number;  // the hero's chips already in on this street
  raises: number;   // raises before the hero on this street (preflop only)
  min: number;
  max: number;
};

const RAISING = new Set(["bet", "raise", "all_in"]);

/** Raises before the hero this preflop; blinds are not logged, so the first
 * raise is the first amount above the big blind. */
export function preflopRaises(log: TableAction[] | undefined, bigBlind: number): number {
  let top = bigBlind;
  let raises = 0;
  for (const a of log ?? []) {
    if (a.street !== "preflop" || !RAISING.has(a.action) || (a.amount ?? 0) <= top) continue;
    top = a.amount ?? top;
    raises += 1;
  }
  return raises;
}

const clamp = (n: number, i: SizingInput) => Math.min(i.max, Math.max(i.min, Math.round(n)));

const PREFLOP_STEPS: Record<number, number[]> = { 0: [2, 2.5, 3], 1: [3, 3.5, 4] };
const POSTFLOP_SHARES: [string, number][] = [["1/3", 1 / 3], ["1/2", 1 / 2], ["2/3", 2 / 3], ["Pot", 1]];

export function presets(i: SizingInput): Preset[] {
  const faced = i.toCall + i.heroBet;  // the highest bet on this street
  if (i.street === "preflop") {
    const steps = PREFLOP_STEPS[i.raises] ?? [2.2, 2.5];
    const base = i.raises === 0 ? i.bigBlind : faced;
    return [...steps.map((k) => ({ key: `${k}x`, label: `${k}x`, amount: clamp(k * base, i) })),
      { key: "allin", label: "All-in", amount: i.max }];
  }
  return POSTFLOP_SHARES.map(([label, share]) => ({
    key: label, label,
    // a pot-size raise: call first, then raise by the pot after the call
    amount: clamp(i.toCall > 0 ? faced + share * (i.pot + i.toCall) : share * i.pot, i),
  }));
}

/** The size picked when the hero's turn starts. */
export function defaultKey(i: SizingInput): string {
  if (i.street !== "preflop") return "1/2";
  return i.raises === 0 ? "2.5x" : i.raises === 1 ? "3x" : "2.2x";
}

/** One press of + or -: a big blind preflop, 5% of the pot after the flop. */
export function stepSize(i: SizingInput): number {
  return i.street === "preflop" ? i.bigBlind : Math.max(i.bigBlind / 2, Math.round(i.pot * 0.05));
}

/** The words of a size note, so another language can order them its own way. */
export interface NoteWords {
  bb: (n: string) => string;
  pot: string;
  share: (share: string) => string;
  percent: (n: number) => string;
}

const ENGLISH: NoteWords = { bb: (n) => `${n} BB`, pot: "pot", share: (s) => `${s} pot`, percent: (n) => `${n}% pot` };

/** "7.5 BB" preflop, "1/2 pot" or "45% pot" after the flop (in Spanish "1/2 del bote"). */
export function sizeNote(amount: number, i: SizingInput, list: Preset[], words: NoteWords = ENGLISH,
  locale = "en-US"): string {
  if (i.street === "preflop") return words.bb(Number((amount / i.bigBlind).toFixed(1)).toLocaleString(locale));
  const named = list.find((p) => p.amount === amount);
  if (named) return named.key === "Pot" ? words.pot : words.share(named.label);
  return words.percent(Math.round((100 * amount) / Math.max(1, i.pot)));
}
