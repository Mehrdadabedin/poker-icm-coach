import { Card, TableState, formatChips } from "../models/game";
import { CardView } from "./CardView";
import { PokerSeat } from "./PokerSeat";

interface PokerTableProps {
  state: TableState;
  children?: React.ReactNode;
}

const ACT_LABEL: Record<string, string> = {
  fold: "FOLDED",
  check: "CHECK",
  call: "CALL",
  bet: "BET",
  raise: "RAISE",
  all_in: "ALL-IN",
};

/** The 9-seat poker table: seats, community board, pot, header info. */
export function PokerTable({ state, children }: PokerTableProps) {
  const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
  const isReview = state.phase === "handOver" && !!state.review;
  const review = state.review ?? null;

  // last action per seat from the live action log
  const lastActionBySeat = new Map<number, string>();
  for (const a of state.actionLog ?? []) {
    lastActionBySeat.set(a.seat, ACT_LABEL[a.action] ?? a.action.toUpperCase());
  }

  const revealBySeat = new Map<number, { cards: Card[] | null; hand: string | null }>();
  for (const s of review?.showdown ?? []) {
    revealBySeat.set(s.seat, { cards: s.cards as Card[], hand: s.handName });
  }
  const winners = new Set(review?.winners ?? []);
  const allIn = new Set(review?.allInSeats ?? []);
  const folded = new Set(review?.foldedSeats ?? []);

  const seatStatus = (seat: number, foldedFlag: boolean, sitsOut: boolean): "won" | "lost" | "allIn" | "folded" | null => {
    if (!isReview || sitsOut) return null;
    if (winners.has(seat)) return "won";
    if (folded.has(seat) || foldedFlag) return "folded";
    if (allIn.has(seat)) return "allIn";
    return "lost"; // reached showdown but did not win
  };

  return (
    <div className="table-wrap" data-testid="poker-table">
      <div className="table-header">
        <span className="tbl-info">
          LEVEL {state.level} — {state.smallBlind}/{state.bigBlind}
        </span>
        <span className="tbl-info">
          {state.inBreak ? "BREAK · " : ""}
          {state.ante > 0 ? `ANTE ${formatChips(state.ante)} · ` : ""}TIME {formatClock(state.secondsLeft)}
        </span>
        <span className="tbl-info" data-testid="pot-amount">
          POT {formatChips(state.pot)}
        </span>
      </div>
      <div className="table-status" data-testid="table-status">
        <span className="tbl-info">HAND #{state.handNumber}</span>
        {state.playersRemaining !== undefined && (
          <span className="tbl-info" data-testid="players-remaining">
            {state.playersRemaining}/9 IN TOURNAMENT{state.inHand !== undefined ? ` · ${state.inHand} IN HAND` : ""}
          </span>
        )}
        {state.totalChips !== undefined && (
          <span className="tbl-info" data-testid="total-chips">
            TOTAL CHIPS {formatChips(state.totalChips)}
          </span>
        )}
        {state.averageStack !== undefined && (
          <span className="tbl-info" data-testid="average-stack">
            AVERAGE STACK {formatChips(state.averageStack)}
          </span>
        )}
        <span className="tbl-info">{isReview ? "HAND COMPLETE" : "LIVE HAND"}</span>
      </div>
      <div className="table-felt">
        {sorted.map((p) => {
          const reveal = revealBySeat.get(p.seat);
          return (
            <PokerSeat
              key={p.seat}
              player={p}
              active={state.currentActor === p.seat && !isReview}
              lastAction={isReview ? undefined : lastActionBySeat.get(p.seat)}
              status={seatStatus(p.seat, p.folded, p.sitsOut)}
              revealCards={isReview ? (reveal?.cards ?? null) : null}
              revealHand={isReview ? (reveal?.hand ?? null) : (p.isHero ? "YOU" : null)}
            />
          );
        })}
        <div className="board">
          {state.communityCards.length === 0 && <span className="board-empty">DEALING…</span>}
          {state.communityCards.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
