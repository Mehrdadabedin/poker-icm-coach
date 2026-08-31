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

export interface TableAction {
  seat: number;
  action: string;
  amount: number | null;
  street: string;
}

export interface ReviewCard {
  rank: string;
  suit: Suit;
}

export interface ReviewShowdown {
  seat: number;
  name: string;
  cards: ReviewCard[];
  handName: string | null;
  isHero: boolean;
  won: boolean;
}

export interface ReviewAction {
  seat: number;
  name: string;
  action: string;
  amount: number | null;
  street: string;
}

export interface BotExplanation {
  seat: number;
  name: string;
  action: string;
  amount: number | null;
  street: string;
  position: string;
  hand: string;
  handCode: string;
  stackBB: number;
  potOdds: string;
  equity: string;
  icmPressure: string;
  faced: string;
  reason: string;
}

export interface HandReview {
  handNumber: number;
  pot: number;
  board: ReviewCard[];
  heroSeat: number;
  heroCards: ReviewCard[];
  heroStart: number;
  heroEnd: number;
  heroNet: number;
  heroWon: boolean;
  chop: boolean;
  heroPosition: string;
  heroRankBefore: number;
  heroRankAfter: number;
  winners: number[];
  foldedSeats: number[];
  allInSeats: number[];
  showdown: ReviewShowdown[];
  actions: ReviewAction[];
  explanations: BotExplanation[];
  winningHandName: string | null;
  heroHandName: string | null;
  losingHandName: string | null;
  pressure: string;
}

export interface TableState {
  tableId: string;
  handNumber: number;
  players: PlayerView[];
  actionLog?: TableAction[];
  playersRemaining?: number;
  inHand?: number;
  review?: HandReview | null;
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
