import { CoachAdvice, TableAction } from "../models/game";
import { ActionHistory } from "./ActionHistory";
import { CoachPanelView } from "./CoachPanelView";

interface TableSidebarProps {
  actions: TableAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  coach: CoachAdvice | null;
  coachCollapsed?: boolean;
  historyCollapsed?: boolean;
  onToggleCoach?: () => void;
  onToggleHistory?: () => void;
}

/** The two side panels of the live table: HAND HISTORY and the ICM COACH.
 * On desktop .table-cols is display: contents, so the panels become grid items
 * of .table-page and land on the right and the left of the poker table. */
export function TableSidebar({ actions, heroSeat, nameBySeat, coach, coachCollapsed, historyCollapsed,
                              onToggleCoach, onToggleHistory }: TableSidebarProps) {
  return (
    <div className="table-cols">
      <ActionHistory
        actions={actions}
        heroSeat={heroSeat}
        nameBySeat={nameBySeat}
        collapsed={historyCollapsed}
        onToggle={onToggleHistory}
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
