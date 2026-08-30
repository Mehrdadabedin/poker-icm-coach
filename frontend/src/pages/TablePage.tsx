import { TableState } from "../models/game";
import { PokerTable } from "../components/PokerTable";

interface TablePageProps {
  state: TableState;
  onAction: (kind: string, amount?: number) => void;
}

/** Full table screen: poker table plus hero action bar (controls in part 016). */
export function TablePage({ state, onAction }: TablePageProps) {
  return (
    <div className="table-page" data-testid="table-page">
      <h1 className="screen-title">POKER ICM COACH</h1>
      <PokerTable state={state}>
        <div className="hero-bar">
          <span className="hero-hand-label">HERO — {state.players.find((p) => p.isHero)?.position ?? "?"}</span>
          <div className="hero-actions-placeholder">
            {state.waitingForHero ? (
              <button className="btn" onClick={() => onAction("check")}>
                CHECK
              </button>
            ) : (
              <span className="waiting-label">Waiting for players…</span>
            )}
          </div>
        </div>
      </PokerTable>
    </div>
  );
}
