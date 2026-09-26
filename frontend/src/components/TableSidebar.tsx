import { useEffect, useState } from "react";
import { CoachAdvice, HandHistoryEntry, TableAction } from "../models/game";
import { request } from "../services/api";
import { ActionHistory, HistoryView } from "./ActionHistory";
import { CoachPanelView } from "./CoachPanelView";

interface TableSidebarProps {
  actions: TableAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  coach: CoachAdvice | null;
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
 * The HAND HISTORY panel gained a view switch (A18): its default stays HAND
 * HISTORY, and WIN / LOSE ANALYSIS only fetches the table owner's completed
 * hands (one read-only GET) when that view is selected. The switch never
 * touches game, table, timer or history data. */
export function TableSidebar({ actions, heroSeat, nameBySeat, coach, tableId, handNumber, currentLevel,
                              coachCollapsed, historyCollapsed, onToggleCoach, onToggleHistory }: TableSidebarProps) {
  const [view, setView] = useState<HistoryView>("history");
  const [hands, setHands] = useState<HandHistoryEntry[] | null>(null);

  // Read-only, per-table: refresh on view activation and when a hand completes
  // (handNumber advances), never while the history view is showing.
  useEffect(() => {
    if (view !== "analysis") return;
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
  }, [view, tableId, handNumber]);

  return (
    <div className="table-cols">
      <ActionHistory
        actions={actions}
        heroSeat={heroSeat}
        nameBySeat={nameBySeat}
        collapsed={historyCollapsed}
        onToggle={onToggleHistory}
        view={view}
        onViewChange={(next) => {
          setHands(null);
          setView(next);
        }}
        hands={hands}
        currentLevel={currentLevel}
      />
      {coach && (
        <CoachPanelView
          coach={coach}
          className="coach-panel table-side"
          testId="coach-panel"
          collapsed={coachCollapsed}
          onToggle={onToggleCoach}
        />
      )}
    </div>
  );
}
