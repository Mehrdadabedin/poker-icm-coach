/* The 10 s auto-next countdown must not run behind the re-entry or hero-out
 * modal. It may start only once the hero picks WATCH TO THE END. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let gameState: Record<string, unknown>;
const startSpy = vi.fn();

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  coachAdvice: vi.fn(async () => ({ recommendedAction: "FOLD", detail: {} })),
  nextHand: vi.fn(async () => ({ ...gameState })),
  getToken: () => "token",
  getUsername: () => "Hero",
  clearAuth: vi.fn(),
  request: vi.fn(async () => { throw new Error("offline"); }),
}));

vi.mock("../src/hooks/useGame", () => ({
  useGame: () => ({
    state: gameState, error: null, act: vi.fn(), nextHand: vi.fn(), acting: false, refresh: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useAutoNext", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/hooks/useAutoNext")>();
  return {
    useAutoNext: (...args: Parameters<typeof real.useAutoNext>) => {
      const hook = real.useAutoNext(...args);
      return { ...hook, start: (from?: number) => { startSpy(from); hook.start(from); } };
    },
  };
});

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

const hero = { seat: 0, name: "Hero", isHero: true, position: "BTN", stack: 0, sitsOut: true };
const bots = [1, 2, 3].map((seat) => ({ seat, name: `Bot ${seat}`, position: "SB", stack: 9_000 }));
const handOver = {
  tableId: "A", handNumber: 7, communityCards: [], pot: 0, smallBlind: 100, bigBlind: 200, ante: 0,
  level: 6, secondsLeft: 600, dealerSeat: 1, heroSeat: 0, waitingForHero: false, phase: "handOver",
  legalActions: [], toCall: 0, actionLog: [], playersRemaining: 3, heroFinishPlace: 4,
};

describe("auto-next countdown behind the elimination modal", () => {
  beforeEach(() => startSpy.mockClear());

  it("starts after a normal hand (control)", async () => {
    gameState = { ...handOver, players: [{ ...hero, stack: 5_000, sitsOut: false }, ...bots] };
    render(await table());
    expect(startSpy).toHaveBeenCalled();
  });

  it("does not start while the re-entry modal is open", async () => {
    gameState = { ...handOver, level: 3, players: [{ ...hero, awaitingReentry: true }, ...bots] };
    render(await table());
    expect(screen.getByTestId("reentry-continue")).toBeInTheDocument();
    expect(startSpy, "countdown started behind the re-entry modal").not.toHaveBeenCalled();
  });

  it("does not start while the hero-out modal is open, only after WATCH TO THE END", async () => {
    gameState = { ...handOver, players: [hero, ...bots] };
    render(await table());
    expect(screen.getByTestId("reentry-watch")).toBeInTheDocument();
    expect(startSpy, "countdown started behind the hero-out modal").not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("reentry-watch"));
    expect(screen.queryByTestId("reentry-modal")).toBeNull();
    expect(startSpy).toHaveBeenCalled();
  });
});
