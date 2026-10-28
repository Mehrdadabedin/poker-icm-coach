import type { MouseEvent } from "react";
import type { Card, CoachAdvice } from "../models/game";
import { CoachSheet } from "./CoachSheet";
import { LinkedText } from "./GlossaryTerm";
import { useT } from "../i18n/I18n";
import { actionWord, coachReason, gradeLine } from "../i18n/coach";

/** CSS class of the coach's action: its colour (styles/table-phone.css). */
export const actionClass = (coach: CoachAdvice) => `act-${coach.recommendedAction.split(" ")[0].toLowerCase()}`;

interface CoachStripProps {
  coach: CoachAdvice | null;
  heroCards?: Card[] | null;
  /** the grade of the hero's last action, for a few seconds */
  grade: Record<string, string> | null;
  sheetOpen: boolean;
  onSheet: (open: boolean) => void;
  onFold: () => void;
}

/** The coach on one line above the felt (plan 101): the action, the reason cut
 * with an ellipsis, and Why. A tap opens the coach sheet; a tap on a term in
 * the reason (CO, SPR) opens its definition instead. */
export function CoachStrip({ coach, heroCards, grade, sheetOpen, onSheet, onFold }: CoachStripProps) {
  const t = useT();
  const line = grade ? gradeLine(grade, t) : null;
  const open = sheetOpen && !!coach;
  const tap = (event: MouseEvent) => {
    if (!coach || (event.target as HTMLElement).closest(".gl-term, button")) return;
    onSheet(!open);
  };
  return (
    <div className={open ? "coach-strip-wrap strip-open" : "coach-strip-wrap"}>
      {open && coach && <CoachSheet coach={coach} heroCards={heroCards} onClose={() => onSheet(false)} />}
      <div className="coach-strip" onClick={tap} role="status" data-testid="coach-strip">
        <span className="strip-text">
          {line ? (
            <>
              <b className={`strip-grade grade-${grade?.grade}`} data-testid="strip-grade">{line.grade}</b>{" · "}{line.text}
            </>
          ) : coach ? (
            <>
              <b className={`strip-action ${actionClass(coach)}`} data-testid="strip-action">{actionWord(coach.recommendedAction, t)}</b>
              {" · "}<LinkedText text={coachReason(coach, t)} />
            </>
          ) : <span className="strip-idle">{t("strip.idle")}</span>}
        </span>
        {coach && !line && (
          <button type="button" className="strip-why" aria-haspopup="dialog" aria-expanded={open}
            aria-label={t("strip.whyLabel")} onClick={() => onSheet(!open)} data-testid="strip-why">{t("strip.why")}</button>
        )}
        <button type="button" className="strip-fold" aria-label={t("strip.fold")} onClick={onFold} data-testid="strip-fold">×</button>
      </div>
    </div>
  );
}
