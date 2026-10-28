import type { Card, CoachAdvice } from "../models/game";
import { CoachReason } from "./CoachReason";
import { RowLabel } from "./GlossaryTerm";
import { useDismiss } from "../hooks/useDismiss";
import { useT } from "../i18n/I18n";
import { actionWord, coachReason, factorRow } from "../i18n/coach";
import { actionClass } from "./CoachStrip";

// street names stay in English in Spanish too: the words players use
const STREET: Record<string, string> = { preflop: "PREFLOP", flop: "FLOP", turn: "TURN", river: "RIVER" };

/** The full advice, dropped from the coach strip over a dimmed table (plan 101):
 * the reason with the hero's cards and every factor row. It closes with its
 * button, a tap outside, Escape and the Android back button. */
export function CoachSheet({ coach, heroCards, onClose }: { coach: CoachAdvice; heroCards?: Card[] | null; onClose: () => void }) {
  const t = useT();
  useDismiss(true, onClose);
  return (
    <>
      <div className="strip-scrim" onClick={onClose} data-testid="coach-sheet-scrim" />
      <div className="coach-sheet" role="dialog" aria-modal="true" aria-label={t("coach.title")} data-testid="coach-sheet">
        <div className="coach-sheet-head">
          <span className="coach-sheet-tag">{t("coach.title")}{coach.street && STREET[coach.street] ? ` · ${STREET[coach.street]}` : ""}</span>
          <b className={`strip-action ${actionClass(coach)}`}>{actionWord(coach.recommendedAction, t)}</b>
          <button type="button" className="sheet-x" aria-label={t("strip.close")} onClick={onClose} data-testid="coach-sheet-close">×</button>
        </div>
        <p className="coach-sheet-why"><CoachReason text={coachReason(coach, t)} cards={heroCards} /></p>
        <dl className="coach-sheet-rows">
          {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => {
            const [label, value] = factorRow(k, v, coach, t);
            return <div key={k}><dt><RowLabel code={k} label={label} /></dt><dd>{value}</dd></div>;
          })}
        </dl>
      </div>
    </>
  );
}
