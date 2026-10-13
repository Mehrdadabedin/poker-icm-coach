import { CoachAdvice } from "../models/game";

/** Which street the advice is for, next to the action (plan 075). */
const STREET_LABEL: Record<string, string> = {
  preflop: "preflop", flop: "on the flop", turn: "on the turn", river: "on the river",
};

interface CoachPanelViewProps {
  coach: CoachAdvice;
  className?: string;
  testId: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

/** ICM COACH card: recommendation, reasoning and the factor breakdown.
 * Shared by the live table sidebar and the post-hand review, which showed the
 * same markup with only the wrapper class and data-testid differing. The live
 * table passes onToggle for a UI-only HIDE/SHOW control that folds the
 * reasoning and the factor rows away; the review omits it and is unchanged.
 * The recommendation itself is always visible, and no data is dropped. */
export function CoachPanelView({ coach, className = "coach-panel", testId, collapsed = false, onToggle }: CoachPanelViewProps) {
  return (
    <div className={className} data-testid={testId}>
      <div className="panel-head">
        <h3>ICM COACH</h3>
        {onToggle && (
          <button className="coach-toggle" onClick={onToggle} data-testid="coach-toggle">
            {collapsed ? "SHOW ▼" : "HIDE ▲"}
          </button>
        )}
      </div>
      <div className="coach-recommendation-row">
        <div className="coach-recommendation">{coach.recommendedAction}</div>
        {coach.street && STREET_LABEL[coach.street] && (
          <span className="coach-street" data-testid="coach-street">{STREET_LABEL[coach.street]}</span>
        )}
      </div>
      {!collapsed && (
        <>
          <p>{coach.reasoning}</p>
          <dl>
            {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => (
              <div key={k} className="coach-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}
