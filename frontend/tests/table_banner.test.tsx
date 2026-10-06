/* A46: the "SUBOPTIMAL - ALL_IN diverges from the recommended FOLD" banner
 * comes from coachCompare() and must clear when the hand number changes, so
 * it never carries stale advice into a new hand. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let gameState: Record<string, unknown>;
const sendAction = vi.fn(async () => ({ ...gameState }));
const coachCompare = vi.fn(async () => ({
  grade: "SUBOPTIMAL",
  explanation: "ALL_IN diverges from the recommended FOLD",
}));

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  sendAction: (...args: unknown[]) => sendAction(...(args as [])),
  coachCompare: (...args: unknown[]) => coachCompare(...(args as [])),
  coachAdvice: vi.fn(async () => ({ recommendedAction: "FOLD", detail: {} })),
  getToken: () => "token",
  getUsername: () => "Hero",
  clearAuth: vi.fn(),
  logout: vi.fn(async () => undefined),
  request: vi.fn(async () => { throw new Error("offline"); }),
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

const baseState = {
  tableId: "A",
  handNumber: 3,
  players: [{ seat: 0, name: "Hero", isHero: true, position: "BTN", stack: 10_000 }],
  communityCards: [],
  pot: 560,
  smallBlind: 100,
  bigBlind: 100,
  ante: 0,
  level: 1,
  secondsLeft: 900,
  currentActor: 0,
  dealerSeat: 0,
  heroSeat: 0,
  waitingForHero: true,
  phase: "playing",
  legalActions: [{ kind: "fold" }, { kind: "call", amount: 160 }, { kind: "all_in" }],
  toCall: 160,
  actionLog: [],
};

describe("coach grade banner (A46)", () => {
  it("clears the banner when a new hand starts", async () => {
    gameState = { ...baseState };
    const { rerender } = render(await table());

    fireEvent.click(screen.getByRole("button", { name: /fold/i }));
    expect(await screen.findByTestId("comparison")).toBeInTheDocument();
    expect(screen.getByText(/SUBOPTIMAL/)).toBeInTheDocument();

    gameState = { ...baseState, handNumber: 4 };
    rerender(await table());
    expect(screen.queryByTestId("comparison")).toBeNull();
  });
});
