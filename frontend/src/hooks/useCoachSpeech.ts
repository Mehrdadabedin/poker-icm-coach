import { useEffect, useRef } from "react";
import { useT } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";
import type { CoachAdvice, TableState } from "../models/game";
import { decisionKey, spokenAdvice } from "../models/coachSpeech";
import { speak, stopSpeaking } from "../services/speech";

/** The coach says its advice aloud once per decision (plan 112). It stops when the turn
 * is over, the voice is turned off, the page is hidden or the table closes. Returns `stop`,
 * for the hero's action to call. */
export function useCoachSpeech(coach: CoachAdvice | null, state: TableState, on: boolean): () => void {
  const t = useT();
  const spoken = useRef<string | null>(null);
  const wasOn = useRef(on);
  const key = decisionKey(state);
  const decision = useRef<{ key: string; stale: CoachAdvice | null }>({ key, stale: null });
  const seen = useRef<CoachAdvice | null>(null);

  useEffect(() => {
    const justTurnedOn = on && !wasOn.current;
    wasOn.current = on;
    // The poll can show the hero's next turn before the new advice arrives. The advice still set
    // then is the last decision's: "Check." facing a bet, or last hand's "Fold." on an open jam
    // (the advice is kept through the end of a hand for the review).
    if (decision.current.key !== key) decision.current = { key, stale: seen.current };
    if (coach) seen.current = coach;
    if (!on || !coach) {
      // only when something was said for this turn: polls with no advice must not cut off
      // "Coach voice on." said by the chip
      if (spoken.current !== null) stopSpeaking();
      spoken.current = null;
      return;
    }
    if (spoken.current === key || coach === decision.current.stale) return;
    spoken.current = key;
    // "Coach voice on." was just said inside the tap: the advice follows it, not over it
    speak(spokenAdvice(coach, state, t), numberLocale(), justTurnedOn);
  }, [coach, key, on, state, t]);

  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") stopSpeaking(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      stopSpeaking();
    };
  }, []);

  return stopSpeaking;
}
