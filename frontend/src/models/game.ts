// Typed game state mirrored from the backend API (part 034 keeps them in sync).

export type Suit = "c" | "d" | "h" | "s";

export interface Card {
  rank: string; // 2..9, T, J, Q, K, A
  suit: Suit;
}

export interface PlayerView {
  seat: number;
  name: string;
  stack: number;
  stackInBB: number;
  position: string;
  bet: number;
  folded: boolean;
  isHero: boolean;
  isDealer: boolean;
  sitsOut: boolean;
  holeCards?: Card[]; // only present for the hero
}

export interface TableState {
  tableId: string;
  handNumber: number;
  players: PlayerView[];
  communityCards: Card[];
  pot: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  level: number;
  secondsLeft: number;
  street: "preflop" | "flop" | "turn" | "river" | "showdown" | "complete";
  currentActor: number | null;
  dealerSeat: number;
  heroSeat: number;
  waitingForHero: boolean;
  phase: "idle" | "playing" | "handOver";
  legalActions: LegalAction[];
  toCall: number;
}

export type ActionKind = "fold" | "check" | "call" | "bet" | "raise" | "all_in";

export interface LegalAction {
  kind: ActionKind;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export const cardSymbol: Record<Suit, string> = {
  c: "\u2663",
  d: "\u2666",
  h: "\u2665",
  s: "\u2660",
};

export const cardColor = (suit: Suit): "red" | "black" =>
  suit === "h" || suit === "d" ? "red" : "black";

export const cardFace = (card: Card): string => `${card.rank}${cardSymbol[card.suit]}`;

export function formatChips(value: number): string {
  return value.toLocaleString("en-US");
}

export function chipsInBB(stack: number, bigBlind: number): number {
  if (bigBlind <= 0) return 0;
  return Math.round((stack / bigBlind) * 10) / 10;
}
