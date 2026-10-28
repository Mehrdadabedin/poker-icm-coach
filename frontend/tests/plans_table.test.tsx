/* Free and Pro (plan 100): the table and Start practice. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeMenu } from "../src/components/HomeMenu";
import { UpgradeSheet } from "../src/components/UpgradeSheet";
import { I18nProvider } from "../src/i18n/I18n";
import { resetPlan } from "../src/services/plan";
import { closeUpgrade } from "../src/services/upgrade";

let plan: "free" | "pro" = "free";
let gameState: Record<string, unknown>;
const { coachAdvice, coachCompare, request, createTournament } = vi.hoisted(() => ({
  coachAdvice: vi.fn(async () => ({ recommendedAction: "FOLD", detail: {} })),
  coachCompare: vi.fn(async () => ({ grade: "OPTIMAL", explanation: "ok" })),
  request: vi.fn(async (_path: string) => ({ hands: [] })),
  createTournament: vi.fn(async () => ({ tableId: "T9" })),
}));

vi.mock("../src/services/profileApi", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAccount: vi.fn(async () => ({ username: "ann", admin: false, signIn: "password", email: null, plan })),
}));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  coachAdvice, coachCompare, request, createTournament,
  sendAction: vi.fn(async () => ({ ...gameState })),
  getUsername: () => "ann",
  logout: vi.fn(async () => undefined),
  adminSummary: vi.fn(async () => { throw new Error("API 403"); }),
}));
vi.mock("../src/hooks/useGame", () => ({
  useGame: () => ({ state: gameState, error: null, act: vi.fn(), nextHand: vi.fn(), acting: false, refresh: vi.fn() }),
}));

const state = {
  tableId: "A", handNumber: 3, playersRemaining: 9,
  players: [{ seat: 0, name: "ann", isHero: true, position: "BTN", stack: 10_000 }],
  communityCards: [], pot: 560, smallBlind: 100, bigBlind: 100, ante: 0, level: 1, secondsLeft: 900,
  currentActor: 0, dealerSeat: 0, heroSeat: 0, waitingForHero: true, phase: "playing",
  legalActions: [{ kind: "fold" }, { kind: "call", amount: 160 }], toCall: 160, actionLog: [],
};

async function table() {
  const { TablePage } = await import("../src/pages/TablePage");
  return (
    <I18nProvider>
      <MemoryRouter initialEntries={["/table/A"]}>
        <Routes><Route path="/table/:tableId" element={<TablePage />} /></Routes>
        <UpgradeSheet />
      </MemoryRouter>
    </I18nProvider>
  );
}
const settle = () => act(async () => undefined);

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  plan = "free";
  gameState = { ...state };
  [coachAdvice, coachCompare, request, createTournament].forEach((m) => m.mockClear());
  resetPlan();
  closeUpgrade();
});

describe("the Free table", () => {
  it("never calls the coach, the grade or the completed hands, and shows the locked chip", async () => {
    render(await table());
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /fold/i }));
    await settle();
    expect(coachAdvice).not.toHaveBeenCalled();
    expect(coachCompare).not.toHaveBeenCalled();
    expect(request.mock.calls.filter(([path]) => String(path).includes("/hands"))).toEqual([]);
    expect(screen.queryByTestId("comparison")).toBeNull();
    expect(screen.queryByTestId("coach-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("coach-chip-side"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a locked line instead of the statistics", async () => {
    render(await table());
    await settle();
    expect(screen.getByTestId("locked-line")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("history-view-select"), { target: { value: "analysis" } });
    expect(screen.getByTestId("locked-line")).toBeInTheDocument();
  });
});

describe("the Pro table", () => {
  it("calls the coach and the grade, and has no chip", async () => {
    plan = "pro";
    render(await table());
    await settle();
    expect(coachAdvice).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /fold/i }));
    await settle();
    expect(coachCompare).toHaveBeenCalled();
    expect(screen.queryByTestId("coach-chip-side")).toBeNull();
  });
});

const home = () => render(
  <I18nProvider>
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<HomeMenu isAdmin={false} />} />
        <Route path="/table/:tableId" element={<div data-testid="table-opened" />} />
        <Route path="/bot-profiles" element={<div data-testid="bots-opened" />} />
      </Routes>
    </MemoryRouter>
  </I18nProvider>,
);

describe("Start practice", () => {
  it("creates the table at once with no lineup for a Free player", async () => {
    home();
    await settle();
    fireEvent.click(screen.getByTestId("start-practice"));
    await settle();
    expect(createTournament).toHaveBeenCalledTimes(1);
    expect(createTournament.mock.calls[0]).toEqual([10]);
    expect(screen.getByTestId("table-opened")).toBeInTheDocument();
  });

  it("opens the bot choice for a Pro player", async () => {
    plan = "pro";
    home();
    await settle();
    fireEvent.click(screen.getByTestId("start-practice"));
    expect(screen.getByTestId("bots-opened")).toBeInTheDocument();
    expect(createTournament).not.toHaveBeenCalled();
  });
});
