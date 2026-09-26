import { ACTION_LABEL, formatChips, HandHistoryEntry, ReviewAction, TableAction } from "../models/game";
import { WinLoseAnalysis } from "./WinLoseAnalysis";

export type HistoryView = "history" | "analysis";

type AnyAction = TableAction | ReviewAction;

const STREET_ORDER = ["preflop", "flop", "turn", "river"];
const STREET_TITLE: Record<string, string> = {
  preflop: "PRE-FLOP",
  flop: "FLOP",
  turn: "TURN",
  river: "RIVER",
};

const BLIND_LABEL: Record<string, string> = {
  small_blind: "posts SB",
  big_blind: "posts BB",
};

interface ActionHistoryProps {
  actions: AnyAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  collapsed?: boolean;
  onToggle?: () => void;
  view?: HistoryView;
  onViewChange?: (view: HistoryView) => void;
  hands?: HandHistoryEntry[] | null;
  currentLevel?: number;
}

/** Structured hand history grouped by street (PRE-FLOP / FLOP / TURN / RIVER).
 * The live table passes onToggle for a UI-only HIDE/SHOW control that folds the
 * list away while the panel title stays; the review omits it. Recording, order
 * and every entry are untouched, only the presentation collapses.
 *
 * The live table can also switch the body to the WIN / LOSE ANALYSIS view
 * (onViewChange + view + hands): a pure presentation switch, the history body
 * below stays byte-for-byte the original. Without onViewChange this component
 * renders exactly as before (the review screen). */

export function ActionHistory({ actions, heroSeat, nameBySeat, collapsed = false, onToggle,
                             view = "history", onViewChange, hands = null, currentLevel }: ActionHistoryProps) {
  const seatName = (a: AnyAction): string => (a as ReviewAction).name ?? nameBySeat.get(a.seat) ?? `Seat ${a.seat}`;
  const groups = STREET_ORDER.map((street) => ({
    street,
    entries: actions.filter((a) => a.street === street && a.action !== "small_blind" && a.action !== "big_blind"),
  }));
  const blindPosts = actions.filter((a) => a.action === "small_blind" || a.action === "big_blind");
  const nonEmpty = groups.some((g) => g.entries.length > 0);

  return (
    <div className="action-history" data-testid="action-history">
      <div className="panel-head">
        {onViewChange ? (
          <label className="history-view-select">
            <select
              value={view}
              onChange={(event) => onViewChange(event.target.value === "analysis" ? "analysis" : "history")}
              data-testid="history-view-select"
              aria-label="Side panel view"
            >
              <option value="history">HAND HISTORY</option>
              <option value="analysis">WIN / LOSE ANALYSIS</option>
            </select>
          </label>
        ) : (
          <h3 className="history-title">HAND HISTORY</h3>
        )}
        {onToggle && (
          <button className="coach-toggle" onClick={onToggle} data-testid="history-toggle">
            {collapsed ? "SHOW ▼" : "HIDE ▲"}
          </button>
        )}
      </div>
      {!collapsed && onViewChange && view === "analysis" ? (
        <WinLoseAnalysis hands={hands ?? []} currentLevel={currentLevel} loading={hands === null} />
      ) : (
        <>
      {!collapsed && blindPosts.length > 0 && (
        <div className="history-line history-blind">
          <span className="history-street-dot">·</span>
          <span>
            {blindPosts.map((b) => (
              <span key={b.seat}>
                <b>{seatName(b)}</b> {BLIND_LABEL[b.action] ?? b.action} {b.amount != null ? formatChips(b.amount) : ""}
                {b.seat !== blindPosts[blindPosts.length - 1].seat ? "  " : ""}
              </span>
            ))}
          </span>
        </div>
      )}
      {!collapsed && !nonEmpty && blindPosts.length === 0 && <div className="history-empty">DEALING…</div>}
      {!collapsed && groups.map(
        (g) =>
          g.entries.length > 0 && (
            <div key={g.street} className="history-street">
              <div className="history-street-title">{STREET_TITLE[g.street]}</div>
              {g.entries.map((a, i) => (
                <div key={i} className="history-line" data-testid={`history-${g.street}-${i}`}>
                  <span className="history-street-dot" />
                  <span className="history-actor">
                    {a.seat === heroSeat ? <b className="history-hero">{nameBySeat.get(heroSeat) ?? "Hero"}</b> : <b>{seatName(a)}</b>}
                    {" — "}
                    <span className={`history-action history-action-${a.action}`}>
                      {ACTION_LABEL[a.action] ?? a.action}
                      {a.amount != null ? ` ${formatChips(a.amount)}` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ),
      )}
        </>
      )}
    </div>
  );
}
