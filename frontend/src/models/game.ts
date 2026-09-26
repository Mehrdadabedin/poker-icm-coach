// Typed game state mirrored from the backend API (part 034 keeps them in sync).

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
  tableLabel?: string;
  username?: string | null;
  handNumber: number;
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
  inBreak?: boolean;
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

// Semantic full-word names for accessibility (A17 professional cards).
// 8 + h => "8 of Hearts"; A + s => "Ace of Spades"; T + d => "10 of Diamonds".
const RANK_WORD: Record<string, string> = {
  A: "Ace", K: "King", Q: "Queen", J: "Jack", T: "10",
  "9": "9", "8": "8", "7": "7", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2",
};
export const SUIT_WORD: Record<Suit, string> = {
  s: "Spades", h: "Hearts", d: "Diamonds", c: "Clubs",
};

// Fixed 9-max seat order, shared by the sample state and the practice tools.
export const POSITIONS_9MAX = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

// Shared by ActionHistory and BotExplanations; PokerTable uses its own
// upper-case, past-tense labels for the in-seat badge and stays separate.
export const ACTION_LABEL: Record<string, string> = {
  fold: "Fold", check: "Check", call: "Call", bet: "Bet", raise: "Raise", all_in: "All-in",
};

export const cardAlt = (card: Card): string =>
  `${RANK_WORD[card.rank] ?? card.rank} of ${SUIT_WORD[card.suit]}`;

export function formatChips(value: number): string {
  return value.toLocaleString("en-US");
}

/** Shared shape for the ICM coach's advice on the current decision, rendered
 * by both the live table sidebar and the post-hand review. */
export interface CoachAdvice {
  recommendedAction: string;
  reasoning: string;
  detail: Record<string, string>;
}

/** Hand-result headline text (HandResult and HandReview show the same
 * CHOPPED/YOU WON/YOU LOST/NO CHANGE facts, just in different layouts). */
export function reviewResultMeta(review: HandReview): { title: string; subtitle: string; glyph: string } {
  const net = review.heroNet;
  const won = review.heroWon && !review.chop;
  const lost = !review.heroWon && !review.chop && net < 0;
  const title = review.chop ? "CHOPPED" : review.heroWon ? "YOU WON" : net === 0 ? "NO CHANGE" : "YOU LOST";
  const subtitle = review.chop
    ? `${net >= 0 ? "+" : "-"}${formatChips(Math.abs(net))} chips`
    : review.heroWon
      ? `+${formatChips(net)} chips`
      : net < 0
        ? `-${formatChips(-net)} chips`
        : "You folded without risking chips";
  const glyph = review.chop ? "⇄" : won ? "✓" : lost ? "✕" : "◼";
  return { title, subtitle, glyph };
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
