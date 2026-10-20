import type { Card, CoachAdvice } from "../models/game";
import { CoachReason } from "./CoachReason";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";
import { actionWord, coachReason, factorRow } from "../i18n/coach";

/** Which street the advice is for, next to the action (plan 075). */
const STREET_LABEL: Record<string, MessageKey> = {
  preflop: "coach.street.preflop", flop: "coach.street.flop", turn: "coach.street.turn", river: "coach.street.river",
};

interface CoachPanelViewProps {
  coach: CoachAdvice;
  className?: string;
  testId: string;
  collapsed?: boolean;
  onToggle?: () => void;
  /** The hero's cards, shown in place of the coach's shorthand ("83o"). */
  heroCards?: Card[] | null;
}

/** ICM COACH card: recommendation, reasoning and the factor breakdown.
 * Shared by the live table sidebar and the post-hand review, which showed the
 * same markup with only the wrapper class and data-testid differing. The live
 * table passes onToggle for a UI-only HIDE/SHOW control that folds the
 * reasoning and the factor rows away; the review omits it and is unchanged.
 * The recommendation itself is always visible, and no data is dropped. */
export function CoachPanelView({ coach, className = "coach-panel", testId, collapsed = false, onToggle, heroCards }: CoachPanelViewProps) {
  const t = useT();
  return (
    <div className={className} data-testid={testId}>
      <div className="panel-head">
        <h3>{t("coach.title")}</h3>
        {onToggle && (
          <button className="coach-toggle" onClick={onToggle} data-testid="coach-toggle">
            {t(collapsed ? "coach.show" : "coach.hide")}
          </button>
        )}
      </div>
      <div className="coach-recommendation-row">
        <div className="coach-recommendation">{actionWord(coach.recommendedAction, t)}</div>
        {coach.street && STREET_LABEL[coach.street] && (
          <span className="coach-street" data-testid="coach-street">{t(STREET_LABEL[coach.street])}</span>
        )}
      </div>
      {!collapsed && (
        <>
          <p><CoachReason text={coachReason(coach, t)} cards={heroCards} /></p>
          <dl>
            {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => {
              const [label, value] = factorRow(k, v, coach, t);
              return (
                <div key={k} className="coach-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </div>
  );
}
