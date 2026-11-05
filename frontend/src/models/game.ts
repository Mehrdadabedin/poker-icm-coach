// Typed game state mirrored from the backend API (part 034 keeps them in sync).
import { numberLocale } from "../i18n/lang";
import type { MessageKey } from "../i18n/messages/en";
import type { Params } from "../i18n/translate";

type Suit = "c" | "d" | "h" | "s";

export interface Card {
  rank: string; // 2..9, T, J, Q, K, A
  suit: Suit;
}

export interface PlayerView {
  seat: number;
  name: string;
  stack: number;
  stackInBB: number;
  position: string | null;
  bet: number;
  folded: boolean;
  isHero: boolean;
  isDealer: boolean;
  sitsOut: boolean;
  awaitingReentry?: boolean;
  /** A28 profile identifier for BOT seats (e.g. "tag"), absent otherwise. */
  profile?: string | null;
  holeCards?: Card[]; // only present for the hero
}

export interface TableAction {
  seat: number;
  action: string;
  amount: number | null;
  street: string;
}

type ReviewCard = Card;

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
  // faced and reason by code, for other languages (plan 093)
  facedCode?: string; facedParams?: Record<string, string>;
  reasonCode?: string; reasonParams?: Record<string, string>;
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

export interface StandingRow { place: number; seat: number; name: string; chips: number; isHero: boolean; out: boolean }

export interface TableState {
  tableId: string;
  tableLabel?: string;
  username?: string | null;
  handNumber: number;
  heroFinishPlace?: number | null;
  /** 1st to 9th once the busted hero ended the game by chips (plan 092). */
  standings?: StandingRow[] | null;
  players: PlayerView[];
  actionLog?: TableAction[];
  playersRemaining?: number;
  inHand?: number;
  totalChips?: number;
  averageStack?: number;
  review?: HandReview | null;
  communityCards: Card[];
  pot: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  level: number;
  secondsLeft: number;
  inBreak?: boolean; away?: boolean; // scheduled tournament break / hero left the table
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

// Fixed 9-max seat order, shared by the sample state and the practice tools.
export const POSITIONS_9MAX = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

// Shared by ActionHistory and BotExplanations; PokerTable uses its own
// upper-case, past-tense labels for the in-seat badge and stays separate.
/** "Ace of Spades", "As de picas": the card's name for a screen reader (plan 111). */
export const cardAlt = (card: Card, t: (key: MessageKey, params?: Params) => string): string =>
  t("a11y.card", { rank: t(`a11y.rank.${card.rank}` as MessageKey), suit: t(`a11y.suit.${card.suit}` as MessageKey) });

export function formatChips(value: number): string {
  return value.toLocaleString(numberLocale());
}

/** Sole survivor is the tournament champion (hero or BOT); null otherwise. */
export function tournamentChampion(
  state: { playersRemaining?: number; players: PlayerView[] },
): PlayerView | null {
  const survivors = state.playersRemaining ?? state.players.length;
  if (survivors !== 1) return null;
  const active = state.players.filter((player) => !player.sitsOut);
  return active.length === 1 ? active[0] : null;
}

/** Shared shape for the ICM coach's advice on the current decision, rendered
 * by both the live table sidebar and the post-hand review. */
export interface CoachAdvice {
  recommendedAction: string; street?: string; // the street the advice is for (plan 075)
  reasoning: string;
  reasonCode?: string; reasonParams?: Record<string, string>; // the reasoning by code (plan 093)
  detail: Record<string, string>;
}

export function chipsInBB(stack: number, bigBlind: number): number {
  if (bigBlind <= 0) return 0;
  return Math.round((stack / bigBlind) * 10) / 10;
}/** One completed hand served by GET /api/game/{tableId}/hands (owner only):
 * net is the hero's chip result for the hand. */
export interface HandHistoryEntry {
  handNumber: number; heroPosition: string; pot: number; winnerSeats: number[];
  stage: string; net: number; heroDecision: string | null;
  coachRecommendation: string | null; grade: string | null;
  level: number; blindLevel: string;
}
