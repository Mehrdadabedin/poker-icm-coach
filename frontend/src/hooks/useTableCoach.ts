import { useEffect, useState } from "react";
import type { ActionKind, CoachAdvice, TableState } from "../models/game";
import { decisionKey } from "../models/coachSpeech";
import { coachAdvice, coachCompare } from "../services/api";
import { RateLimitError } from "../services/rateLimit";
import type { Plan } from "../services/plan";

/** The coach's advice and the grade of the hero's last action. A Free table
 * (plan 100) never calls the coach: the server would answer 402. The advice
 * waits for the plan, so a Free table sends no request at all. */
export function useTableCoach(
  tableId: string,
  state: TableState | null,
  act: (kind: ActionKind, amount?: number) => Promise<TableState | undefined>,
  plan: Plan,
) {
  const locked = plan.known && !plan.pro;
  const waiting = plan.loading;
  const [advice, setAdvice] = useState<{ data: CoachAdvice; key: string } | null>(null);
  const key = state ? decisionKey(state) : "";
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);

  // The hero can be the actor more than once in a hand, on a later street or on
  // the same one after somebody reopens the betting. The 350 ms poll often never
  // catches the gap between those turns, so without a dependency that moves with
  // the action the panel kept showing the numbers from the earlier decision:
  // preflop pot odds with three cards out, or a board texture of n/a. street
  // covers the first case and the length of the action log covers the second.
  useEffect(() => {
    if (locked || waiting) return;
    if (state?.waitingForHero) {
      coachAdvice(tableId)
        .then((data) => setAdvice({ data, key }))
        // Without this the panel keeps showing the previous decision's numbers.
        .catch((e: unknown) => { if (e instanceof RateLimitError) setAdvice(null); });
    } else if (state?.phase !== "handOver") {
      setAdvice(null);
    }
  }, [locked, waiting, state?.waitingForHero, state?.phase, key, tableId]);

  // The poll can show the hero's next turn before its advice arrives: after a check and a bet,
  // or on the next hand, since the advice is kept through the end of a hand for the review.
  // Advice asked for another decision is never shown for this one, nor a late answer to it.
  const coach = advice && (advice.key === key || state?.phase === "handOver") ? advice.data : null;

  // A46: a coach-grade banner must not survive the hand it graded.
  useEffect(() => setComparison(null), [state?.handNumber]);

  const onAction = async (kind: ActionKind, amount?: number) => {
    const next = await act(kind, amount);
    if (next && !locked) setComparison(await coachCompare(tableId).catch(() => null));
    return next;
  };

  return { coach, comparison, onAction };
}
