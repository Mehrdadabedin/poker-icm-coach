import { TableState } from "../models/game";

interface TableHeaderProps {
  state: TableState;
  username: string | null;
  paused: boolean;
  handOver: boolean;
  isReview: boolean;
  onHome: () => void;
  onLogout: () => void;
  onTogglePause: () => void;
}

/** Top bar: app title, table label, authenticated user and the HOME / PAUSE /
 * LOG OUT controls for the automatic next hand. No PLAY action exists here. */
export function TableHeader({ state, username, paused, handOver, isReview, onHome, onLogout, onTogglePause }: TableHeaderProps) {
  return (
    <div className="top-bar app-header" data-testid="app-header">
      <h1 className="screen-title header-title" data-testid="app-title">ICM MASTER</h1>
      <div className="header-right">
        {state.tableLabel && (
          <span className="tbl-label" data-testid="table-label">TABLE {state.tableLabel}</span>
        )}
        <span className="header-user" data-testid="header-username">{username ?? state.username ?? ""}</span>
        <button className="btn btn-small header-btn" onClick={onHome} data-testid="home-btn">
          HOME
        </button>
        <button className="btn btn-logout" onClick={onLogout} data-testid="logout-btn">
          LOG OUT
        </button>
        <button
          className={`btn btn-small header-btn header-icon-btn header-pause ${paused ? "header-icon-play" : ""}`}
          onClick={onTogglePause}
          disabled={!handOver || isReview}
          title={paused ? "Resume automatic next hand" : "Pause automatic next hand"}
          aria-label={paused ? "Resume automatic next hand" : "Pause automatic next hand"}
          data-testid="pause-play"
        >
          {paused ? "▶" : "⏸"}
          <span className="header-pause-label">{paused ? " RESUME" : " PAUSE"}</span>
        </button>
      </div>
    </div>
  );
}
