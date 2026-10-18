import { useState } from "react";
import type { CoachAdvice } from "../models/game";

const STREET: Record<string, string> = { preflop: "PREFLOP", flop: "FLOP", turn: "TURN", river: "RIVER" };

/** The coach's advice at the top of the table on a phone (plan 087), where
 * the side panel would sit far below the table. It shows during the hero's
 * turn and goes when the hero acts; Details opens the factor rows. The
 * desktop hides it and keeps the side panel. */
export function MobileCoachCard({ coach }: { coach: CoachAdvice }) {
  const [open, setOpen] = useState(false);
  const kind = coach.recommendedAction.split(" ")[0].toLowerCase();
  return (
    <div className="mobile-coach" data-testid="mobile-coach" role="status">
      <div className="mobile-coach-head">
        <span className="mobile-coach-tag">ICM COACH{coach.street && STREET[coach.street] ? ` · ${STREET[coach.street]}` : ""}</span>
        <b className={`mobile-coach-action act-${kind}`} data-testid="mobile-coach-action">{coach.recommendedAction}</b>
      </div>
      <p className="mobile-coach-why">{coach.reasoning}</p>
      <button type="button" className="mobile-coach-more" aria-expanded={open}
        data-testid="mobile-coach-details" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide details ▴" : "Details ▾"}
      </button>
      {open && (
        <dl className="mobile-coach-rows">
          {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}
