/* The coach panel has to follow the street. The hero can be the actor twice in
 * one hand, preflop and again on the flop, and nothing else the effect watched
 * changed between those two turns, so the panel kept showing preflop numbers. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const coachAdvice = vi.fn(async () => ({ recommendedAction: "FOLD", detail: {} }));
let gameState: Record<string, unknown>;

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  coachAdvice: (...args: unknown[]) => coachAdvice(...(args as [])),
  coachCompare: vi.fn(async () => null),
  getToken: () => "token",
  getUsername: () => "Hero",
  clearAuth: vi.fn(),
  logout: vi.fn(async () => undefined),
}));

vi.mock("../src/hooks/useGame", () => ({
  useGame: () => ({
    state: gameState,
    error: null,
    act: vi.fn(),
    nextHand: vi.fn(),
    acting: false,
    refresh: vi.fn(),
  }),
}));

async function table() {
  const { TablePage } = await import("../src/pages/TablePage");
  return (
    <MemoryRouter initialEntries={["/table/A"]}>
      <Routes>
        <Route path="/table/:tableId" element={<TablePage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderTable() {
  return render(await table());
}

const baseState = {
  tableId: "A", handNumber: 3, players: [], communityCards: [], pot: 560,
  smallBlind: 100, bigBlind: 100, ante: 0, level: 1, secondsLeft: 900,
  currentActor: 0, dealerSeat: 5, heroSeat: 0, waitingForHero: true,
  phase: "playing", legalActions: [{ kind: "fold" }], toCall: 160,
  actionLog: [], allInSeats: [],
};

describe("coach panel follows the street", () => {
  beforeEach(() => {
    coachAdvice.mockClear();
  });

  it("asks again when somebody reopens the betting on the same street", async () => {
    gameState = { ...baseState, street: "flop", actionLog: [{ seat: 1, action: "check" }] };
    const { rerender } = await renderTable();
    expect(coachAdvice).toHaveBeenCalledTimes(1);

    gameState = {
      ...baseState,
      street: "flop",
      toCall: 250,
      actionLog: [{ seat: 1, action: "check" }, { seat: 2, action: "bet" }],
    };
    rerender(await table());
    expect(coachAdvice).toHaveBeenCalledTimes(2);
  });

  it("asks again when the street changes while the hero is still to act", async () => {
    gameState = { ...baseState, street: "preflop" };
    const { rerender } = await renderTable();
    expect(coachAdvice).toHaveBeenCalledTimes(1);

    gameState = { ...baseState, street: "flop" };
    rerender(await table());
    expect(coachAdvice).toHaveBeenCalledTimes(2);
  });
});
