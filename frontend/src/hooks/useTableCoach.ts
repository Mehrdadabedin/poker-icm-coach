import { useEffect, useState } from "react";
import type { ActionKind, CoachAdvice, TableState } from "../models/game";
import { coachAdvice, coachCompare } from "../services/api";
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
  const [coach, setCoach] = useState<CoachAdvice | null>(null);
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
        .then((data) => setCoach(data))
        .catch(() => undefined);
    } else if (state?.phase !== "handOver") {
      setCoach(null);
    }
  }, [locked, waiting, state?.waitingForHero, state?.handNumber, state?.phase, state?.street,
      state?.actionLog?.length, tableId]);

  // A46: a coach-grade banner must not survive the hand it graded.
  useEffect(() => setComparison(null), [state?.handNumber]);

  const onAction = async (kind: ActionKind, amount?: number) => {
    const next = await act(kind, amount);
    if (next && !locked) setComparison(await coachCompare(tableId).catch(() => null));
    return next;
  };

  return { coach, comparison, onAction };
}
