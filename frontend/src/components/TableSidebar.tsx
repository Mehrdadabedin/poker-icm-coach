import { Card, CoachAdvice } from "../models/game";
import { usePlan } from "../services/plan";
import { LockedCoachChip } from "./LockedCoach";
import { CoachPanelView } from "./CoachPanelView";

interface TableSidebarProps {
  coach: CoachAdvice | null;
  heroCards?: Card[] | null;
  coachCollapsed?: boolean;
  onToggleCoach?: () => void;
}

/** The ICM COACH panel at the left of the live table, the window's full height.
 * The hand history is a panel over the right of the table now (plan 106). */
export function TableSidebar({ coach, heroCards, coachCollapsed, onToggleCoach }: TableSidebarProps) {
  const plan = usePlan();
  const locked = plan.known && !plan.pro;
  return (
    <div className="table-cols">
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
