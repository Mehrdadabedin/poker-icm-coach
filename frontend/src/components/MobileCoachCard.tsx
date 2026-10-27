import { useState } from "react";
import type { Card, CoachAdvice } from "../models/game";
import { CoachReason } from "./CoachReason";
import { RowLabel } from "./GlossaryTerm";
import { useT } from "../i18n/I18n";
import { actionWord, coachReason, factorRow } from "../i18n/coach";

// street names stay in English in Spanish too: preflop, flop, turn and river are the words players use
const STREET: Record<string, string> = { preflop: "PREFLOP", flop: "FLOP", turn: "TURN", river: "RIVER" };

/** The coach's advice at the top of the table on a phone (plan 087), where
 * the side panel would sit far below the table. It shows during the hero's
 * turn and goes when the hero acts; Details opens the factor rows. The
 * desktop hides it and keeps the side panel. */
export function MobileCoachCard({ coach, heroCards }: { coach: CoachAdvice; heroCards?: Card[] | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const kind = coach.recommendedAction.split(" ")[0].toLowerCase();
  return (
    <div className="mobile-coach" data-testid="mobile-coach" role="status">
      <div className="mobile-coach-head">
        <span className="mobile-coach-tag">{t("coach.title")}{coach.street && STREET[coach.street] ? ` · ${STREET[coach.street]}` : ""}</span>
        <b className={`mobile-coach-action act-${kind}`} data-testid="mobile-coach-action">{actionWord(coach.recommendedAction, t)}</b>
      </div>
      <p className="mobile-coach-why"><CoachReason text={coachReason(coach, t)} cards={heroCards} /></p>
      <button type="button" className="mobile-coach-more" aria-expanded={open}
        data-testid="mobile-coach-details" onClick={() => setOpen((v) => !v)}>
        {t(open ? "coach.hideDetails" : "coach.details")}
      </button>
      {open && (
        <dl className="mobile-coach-rows">
          {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => {
            const [label, value] = factorRow(k, v, coach, t);
            return <div key={k}><dt><RowLabel code={k} label={label} /></dt><dd>{value}</dd></div>;
          })}
        </dl>
      )}
    </div>
  );
}
