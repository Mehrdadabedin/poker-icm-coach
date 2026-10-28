import { formatChips, HandHistoryEntry, ReviewAction, TableAction } from "../models/game";
import { useT } from "../i18n/I18n";
import { ACTION_KEY } from "../i18n/poker";
import type { MessageKey } from "../i18n/messages/en";
import { LockedLine } from "./LockedCoach";
import { OverallPerformance, WinLoseAnalysis } from "./WinLoseAnalysis";

export type HistoryView = "history" | "analysis";

type AnyAction = TableAction | ReviewAction;

const STREET_ORDER = ["preflop", "flop", "turn", "river"];
// flop, turn and river are the words Spanish players use too
const STREET_TITLE: Record<string, string> = { flop: "FLOP", turn: "TURN", river: "RIVER" };

const BLIND_LABEL: Record<string, MessageKey> = { small_blind: "history.postsSB", big_blind: "history.postsBB" };

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
  /** Free plan: the completed hands and the statistics are Pro */
  locked?: boolean;
}

/** Structured hand history grouped by street (PRE-FLOP / FLOP / TURN / RIVER).
 * The live table passes onToggle for a UI-only HIDE/SHOW control that folds the
 * list away while the panel title stays; the review omits it. Recording, order
 * and every entry are untouched, only the presentation collapses.
 *
 * On the live table (onViewChange + view + hands) the default view puts
 * OVERALL PERFORMANCE above the history, and RESULTS BY POSITION swaps the
 * body for the position and blind-level breakdowns. Without onViewChange this
 * component renders the history alone (the review screen). */

export function ActionHistory({ actions, heroSeat, nameBySeat, collapsed = false, onToggle,
                             view = "history", onViewChange, hands = null, currentLevel, locked = false }: ActionHistoryProps) {
  const t = useT();
  const seatName = (a: AnyAction): string => (a as ReviewAction).name ?? nameBySeat.get(a.seat) ?? t("showdown.seat", { n: a.seat });
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
              aria-label={t("history.view")}
            >
              <option value="history">{t("history.title")}</option>
              <option value="analysis">{t("history.byPosition")}</option>
            </select>
          </label>
        ) : (
          <h3 className="history-title">{t("history.title")}</h3>
        )}
        {onToggle && (
          <button className="coach-toggle" onClick={onToggle} data-testid="history-toggle">
            {t(collapsed ? "coach.show" : "coach.hide")}
          </button>
        )}
      </div>
      {!collapsed && onViewChange && view === "analysis" && locked ? (
        <LockedLine />
      ) : !collapsed && onViewChange && view === "analysis" ? (
        <WinLoseAnalysis hands={hands ?? []} currentLevel={currentLevel} loading={hands === null} />
      ) : (
        <>
      {!collapsed && onViewChange && locked && <LockedLine />}
      {!collapsed && onViewChange && !locked && <OverallPerformance hands={hands ?? []} loading={hands === null} />}
      {!collapsed && blindPosts.length > 0 && (
        <div className="history-line history-blind">
          <span className="history-street-dot">·</span>
          <span>
            {blindPosts.map((b) => (
              <span key={b.seat}>
                <b>{seatName(b)}</b> {BLIND_LABEL[b.action] ? t(BLIND_LABEL[b.action]) : b.action} {b.amount != null ? formatChips(b.amount) : ""}
                {b.seat !== blindPosts[blindPosts.length - 1].seat ? "  " : ""}
              </span>
            ))}
          </span>
        </div>
      )}
      {!collapsed && !nonEmpty && blindPosts.length === 0 && <div className="history-empty">{t("history.dealing")}</div>}
      {!collapsed && groups.map(
        (g) =>
          g.entries.length > 0 && (
            <div key={g.street} className="history-street">
              <div className="history-street-title">{g.street === "preflop" ? t("history.preflop") : STREET_TITLE[g.street]}</div>
              {g.entries.map((a, i) => (
                <div key={i} className="history-line" data-testid={`history-${g.street}-${i}`}>
                  <span className="history-street-dot" />
                  <span className="history-actor">
                    {a.seat === heroSeat ? <b className="history-hero">{nameBySeat.get(heroSeat) ?? "Hero"}</b> : <b>{seatName(a)}</b>}
                    {" — "}
                    <span className={`history-action history-action-${a.action}`}>
                      {ACTION_KEY[a.action] ? t(ACTION_KEY[a.action]) : a.action}
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
