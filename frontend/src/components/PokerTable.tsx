import { TableState, formatChips } from "../models/game";
import { CardView } from "./CardView";
import { PokerSeat } from "./PokerSeat";

interface PokerTableProps {
  state: TableState;
  children?: React.ReactNode;
}

/** The 9-seat poker table: seats, community board, pot, header info. */
export function PokerTable({ state, children }: PokerTableProps) {
  const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
  return (
    <div className="table-wrap" data-testid="poker-table">
      <div className="table-header">
        <span className="tbl-info">
          LEVEL {state.level} — {state.smallBlind}/{state.bigBlind}
        </span>
        <span className="tbl-info">
          {state.ante > 0 ? `ANTE ${formatChips(state.ante)} · ` : ""}TIME {formatClock(state.secondsLeft)}
        </span>
        <span className="tbl-info" data-testid="pot-amount">
          POT {formatChips(state.pot)}
        </span>
      </div>
      <div className="table-felt">
        {sorted.map((p) => (
          <PokerSeat key={p.seat} player={p} active={state.currentActor === p.seat} />
        ))}
        <div className="board">
          {state.communityCards.length === 0 && <span className="board-empty">DEALING…</span>}
          {state.communityCards.map((c, i) => (
            <CardView key={i} card={c} small />
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
