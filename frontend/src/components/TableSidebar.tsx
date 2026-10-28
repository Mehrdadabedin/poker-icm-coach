import { useEffect, useState } from "react";
import { Card, CoachAdvice, HandHistoryEntry, TableAction } from "../models/game";
import { request } from "../services/api";
import { usePlan } from "../services/plan";
import { ActionHistory, HistoryView } from "./ActionHistory";
import { LockedCoachChip } from "./LockedCoach";
import { CoachPanelView } from "./CoachPanelView";

interface TableSidebarProps {
  actions: TableAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  coach: CoachAdvice | null;
  heroCards?: Card[] | null;
  tableId: string;
  handNumber: number;
  currentLevel?: number;
  coachCollapsed?: boolean;
  historyCollapsed?: boolean;
  onToggleCoach?: () => void;
  onToggleHistory?: () => void;
}

/** The two side panels of the live table: HAND HISTORY and the ICM COACH.
 * On desktop .table-cols is display: contents, so the panels become grid items
 * of .table-page and land on the right and the left of the poker table.
 *
 * The HAND HISTORY panel has a view switch (A18): the default HAND HISTORY
 * view shows OVERALL PERFORMANCE above the history, RESULTS BY POSITION the
 * breakdowns. Both read the table owner's completed hands (one read-only
 * GET). The switch never touches game, table, timer or history data. */
export function TableSidebar({ actions, heroSeat, nameBySeat, coach, heroCards, tableId, handNumber, currentLevel,
                              coachCollapsed, historyCollapsed, onToggleCoach, onToggleHistory }: TableSidebarProps) {
  const plan = usePlan();
  const locked = plan.known && !plan.pro;
  const [view, setView] = useState<HistoryView>("history");
  const [hands, setHands] = useState<HandHistoryEntry[] | null>(null);

  // Read-only, per-table: fetch when handNumber advances (a hand completed),
  // not on the 350 ms state poll and not on a view switch.
  useEffect(() => {
    if (locked || plan.loading) return undefined;
    let cancelled = false;
    request<{ hands: HandHistoryEntry[] }>(`/api/game/${encodeURIComponent(tableId)}/hands`)
      .then((data) => {
        if (!cancelled) setHands(data.hands);
      })
      .catch(() => {
        if (!cancelled) setHands([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, handNumber, locked, plan.loading]);

  return (
    <div className="table-cols">
      <ActionHistory
        actions={actions}
        heroSeat={heroSeat}
        nameBySeat={nameBySeat}
        collapsed={historyCollapsed}
        onToggle={onToggleHistory}
        view={view}
        onViewChange={setView}
        hands={hands}
        locked={locked}
        currentLevel={currentLevel}
      />
      {locked ? <LockedCoachChip place="side" /> : coach && (
        <CoachPanelView
          coach={coach}
          className="coach-panel table-side"
          testId="coach-panel"
          collapsed={coachCollapsed}
          onToggle={onToggleCoach}
          heroCards={heroCards}
        />
      )}
    </div>
  );
}
