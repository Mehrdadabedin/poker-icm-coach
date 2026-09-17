import { CoachAdvice } from "../models/game";

interface CoachPanelViewProps {
  coach: CoachAdvice;
  className?: string;
  testId: string;
}

/** ICM COACH card: recommendation, reasoning and the factor breakdown.
 * Shared by the live table sidebar and the post-hand review, which showed the
 * same markup with only the wrapper class and data-testid differing. */
export function CoachPanelView({ coach, className = "coach-panel", testId }: CoachPanelViewProps) {
  return (
    <div className={className} data-testid={testId}>
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
  );
}
