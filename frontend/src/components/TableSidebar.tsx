import { CoachAdvice, TableAction } from "../models/game";
import { ActionHistory } from "./ActionHistory";
import { CoachPanelView } from "./CoachPanelView";

interface TableSidebarProps {
  actions: TableAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  coach: CoachAdvice | null;
}

/** Right-hand column under the table: live action history and the coach. */
export function TableSidebar({ actions, heroSeat, nameBySeat, coach }: TableSidebarProps) {
  return (
    <div className="table-cols">
      <ActionHistory actions={actions} heroSeat={heroSeat} nameBySeat={nameBySeat} />
      {coach && <CoachPanelView coach={coach} className="coach-panel table-side" testId="coach-panel" />}
    </div>
  );
}
