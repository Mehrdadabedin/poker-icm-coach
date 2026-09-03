import { ActionHistory } from "./ActionHistory";

interface CoachPanel {
  recommendedAction: string;
  reasoning: string;
  detail: Record<string, string>;
}

interface TableSidebarProps {
  actions: Array<{ seat: number; action: string; amount: number | null; street: string }>;
  heroSeat: number;
  nameBySeat: Map<number, string>;
  coach: CoachPanel | null;
}

/** Right-hand column under the table: live action history and the coach. */
export function TableSidebar({ actions, heroSeat, nameBySeat, coach }: TableSidebarProps) {
  return (
    <div className="table-cols">
      <ActionHistory actions={actions} heroSeat={heroSeat} nameBySeat={nameBySeat} />
      {coach && (
        <div className="coach-panel table-side" data-testid="coach-panel">
          <h3>ICM COACH</h3>
          <div className="coach-recommendation">{coach.recommendedAction}</div>
          <p>{coach.reasoning}</p>
          <dl>
            {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => (
              <div key={k} className="coach-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
