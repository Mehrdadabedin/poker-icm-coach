import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/I18n";
import type { CoachAdvice, TableState } from "../models/game";
import { announcementsFor } from "../models/tableAnnouncements";

/** Two hidden live regions for the table (plan 111): polite for what happens,
 * assertive for the hero's turn. They are mounted once and never inside a box
 * that comes and goes, and the text is replaced, so each message is read once. */
export function TableAnnouncer({ state, coach }: { state: TableState; coach: CoachAdvice | null }) {
  const t = useT();
  const prev = useRef<{ state: TableState; coach: CoachAdvice | null } | null>(null);
  const [said, setSaid] = useState({ polite: "", assertive: "" });

  useEffect(() => {
    const last = prev.current;
    prev.current = { state, coach };
    const news = announcementsFor(last?.state ?? null, state, { coach, prevCoach: last?.coach ?? null }, t);
    setSaid({ polite: news.polite ?? "", assertive: news.assertive ?? "" });
  }, [state, coach, t]);

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announce-polite">{said.polite}</div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="announce-assertive">{said.assertive}</div>
    </>
  );
}
