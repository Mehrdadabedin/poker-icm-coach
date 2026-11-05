/* The coach panel never shows one decision's advice for another (plan 112 owner reports). The
 * 350 ms poll can show the hero's next turn before its advice arrives: after a check and a bet
 * the panel and the voice said CHECK facing the bet, and on the next hand last hand's FOLD. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { CoachAdvice, TableAction, TableState } from "../src/models/game";
import { useTableCoach } from "../src/hooks/useTableCoach";

const asked = vi.hoisted(() => [] as ((advice: CoachAdvice) => void)[]);
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  coachAdvice: () => new Promise<CoachAdvice>((resolve) => asked.push(resolve)),
}));

const plan = { known: true, pro: true, loading: false, admin: false };
const advice = (recommendedAction: string): CoachAdvice => ({ recommendedAction, reasoning: "", detail: {} });
const CHECKED: TableAction[] = [{ seat: 1, action: "check", amount: 0, street: "flop" }];
const BET: TableAction[] = [...CHECKED, { seat: 0, action: "check", amount: 0, street: "flop" }, { seat: 1, action: "bet", amount: 300, street: "flop" }];
const turn = (patch: Partial<TableState> = {}) =>
  ({ handNumber: 3, street: "flop", phase: "playing", waitingForHero: true, actionLog: CHECKED, ...patch }) as TableState;

function table(state: TableState) {
  return renderHook(({ s }) => useTableCoach("t1", s, vi.fn(async () => undefined), plan), { initialProps: { s: state } });
}
async function answer(n: number, word: string) {
  await act(async () => asked[n](advice(word)));
}

beforeEach(() => { asked.length = 0; });

describe("the coach's advice belongs to one decision", () => {
  it("after a check and a bet, shows nothing until the new advice, not the old check", async () => {
    const { result, rerender } = table(turn());
    await answer(0, "CHECK");
    expect(result.current.coach?.recommendedAction).toBe("CHECK");
    rerender({ s: turn({ actionLog: BET }) });
    expect(result.current.coach).toBeNull();
    await answer(1, "CALL");
    expect(result.current.coach?.recommendedAction).toBe("CALL");
  });

  it("on the next hand, shows nothing until the new advice, not last hand's fold", async () => {
    const { result, rerender } = table(turn({ street: "preflop", actionLog: [] }));
    await answer(0, "FOLD");
    rerender({ s: turn({ street: "preflop", phase: "handOver", waitingForHero: false, actionLog: CHECKED }) });
    expect(result.current.coach?.recommendedAction).toBe("FOLD"); // kept for the hand review
    rerender({ s: turn({ handNumber: 4, street: "preflop", actionLog: [] }) });
    expect(result.current.coach).toBeNull();
    await answer(1, "OPEN JAM");
    expect(result.current.coach?.recommendedAction).toBe("OPEN JAM");
  });

  it("drops a late answer asked for an earlier decision", async () => {
    const { result, rerender } = table(turn());
    rerender({ s: turn({ actionLog: BET }) });
    await answer(0, "CHECK");
    expect(result.current.coach).toBeNull();
    await answer(1, "CALL");
    expect(result.current.coach?.recommendedAction).toBe("CALL");
  });
});
