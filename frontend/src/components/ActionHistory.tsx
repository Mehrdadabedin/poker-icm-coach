import { formatChips, ReviewAction, TableAction } from "../models/game";

type AnyAction = TableAction | ReviewAction | { seat: number; name: string; action: string; amount: number | null; street: string };

const STREET_ORDER = ["preflop", "flop", "turn", "river"];
const STREET_TITLE: Record<string, string> = {
  preflop: "PRE-FLOP",
  flop: "FLOP",
  turn: "TURN",
  river: "RIVER",
};

const ACTION_LABEL: Record<string, string> = {
  small_blind: "posts SB",
  big_blind: "posts BB",
  fold: "Fold",
  check: "Check",
  call: "Call",
  bet: "Bet",
  raise: "Raise",
  all_in: "All-in",
};

interface ActionHistoryProps {
  actions: AnyAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
}

/** Structured hand history grouped by street (PRE-FLOP / FLOP / TURN / RIVER). */
export function ActionHistory({ actions, heroSeat, nameBySeat }: ActionHistoryProps) {
  const seatName = (a: AnyAction): string => (a as ReviewAction).name ?? nameBySeat.get(a.seat) ?? `Seat ${a.seat}`;
  const groups = STREET_ORDER.map((street) => ({
    street,
    entries: actions.filter((a) => a.street === street && a.action !== "small_blind" && a.action !== "big_blind"),
  }));
  const blindPosts = actions.filter((a) => a.action === "small_blind" || a.action === "big_blind");
  const nonEmpty = groups.some((g) => g.entries.length > 0);

  return (
    <div className="action-history" data-testid="action-history">
      <h3 className="history-title">HAND HISTORY</h3>
      {blindPosts.length > 0 && (
        <div className="history-line history-blind">
          <span className="history-street-dot">·</span>
          <span>
            {blindPosts.map((b) => (
              <span key={b.seat}>
                <b>{seatName(b)}</b> {ACTION_LABEL[b.action] ?? b.action} {b.amount != null ? formatChips(b.amount) : ""}
                {b.seat !== blindPosts[blindPosts.length - 1].seat ? "  " : ""}
              </span>
            ))}
          </span>
        </div>
      )}
      {!nonEmpty && blindPosts.length === 0 && <div className="history-empty">DEALING…</div>}
      {groups.map(
        (g) =>
          g.entries.length > 0 && (
            <div key={g.street} className="history-street">
              <div className="history-street-title">{STREET_TITLE[g.street]}</div>
              {g.entries.map((a, i) => (
                <div key={i} className="history-line" data-testid={`history-${g.street}-${i}`}>
                  <span className="history-street-dot" />
                  <span className="history-actor">
                    {a.seat === heroSeat ? <b className="history-hero">Hero</b> : <b>{seatName(a)}</b>}
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
    </div>
  );
}
