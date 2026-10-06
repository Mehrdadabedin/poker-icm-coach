/* Champion screen on the live table: it covers the whole table area, keeps
 * the page header, places its text inside the plaque, shows the hero's place
 * when a BOT won, and START NEW SESSION opens a fresh Level 1 table. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const states = new Map<string, Record<string, unknown>>();
const startSpy = vi.fn();
const createTournament = vi.fn(async () => ({ tableId: "T2" }));

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createTournament: (...args: unknown[]) => createTournament(...(args as [])),
  coachAdvice: vi.fn(async () => ({ recommendedAction: "FOLD", detail: {} })),
  getToken: () => "token",
  getUsername: () => "Hero",
  clearAuth: vi.fn(),
  request: vi.fn(async () => ({ hands: [] })),
}));

vi.mock("../src/hooks/useGame", () => ({
  useGame: (tableId: string) => ({
    state: states.get(tableId) ?? null, error: null, act: vi.fn(), nextHand: vi.fn(), acting: false, refresh: vi.fn(),
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

const PROFILES = ["tag", "lag", "tag", "rock", "lag", "tag", "rock", "lag"];
const review = {
  handNumber: 40, pot: 9000, board: [], heroSeat: 0, heroCards: [], heroStart: 0, heroEnd: 0, heroNet: 0,
  heroWon: false, chop: false, heroPosition: "BTN", heroRankBefore: 3, heroRankAfter: 3, winners: [1],
  foldedSeats: [], allInSeats: [], showdown: [], actions: [], explanations: [], winningHandName: null,
  heroHandName: null, losingHandName: null, pressure: "LOW",
};

function table(champion: number, place: number | null, extra: Record<string, unknown> = {}) {
  return {
    tableId: "T1", handNumber: 40, communityCards: [], pot: 0, smallBlind: 2000, bigBlind: 4000, ante: 0,
    level: 15, secondsLeft: 300, dealerSeat: 1, heroSeat: 0, waitingForHero: false, phase: "handOver",
    legalActions: [], toCall: 0, actionLog: [], playersRemaining: 1, heroFinishPlace: place, review,
    players: Array.from({ length: 9 }, (_, seat) => ({
      seat, name: seat === 0 ? "Hero" : `Bot ${seat}`, isHero: seat === 0, position: "BTN",
      stack: seat === champion ? 405_000 : 0, sitsOut: seat !== champion,
      profile: seat === 0 ? undefined : PROFILES[seat - 1],
    })),
    ...extra,
  };
}

async function renderTable(id = "T1") {
  const { TablePage } = await import("../src/pages/TablePage");
  render(
    <MemoryRouter initialEntries={[`/table/${id}`]}>
      <Routes>
        <Route path="/table/:tableId" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => undefined);
}

function loadCss(file: string) {
  const style = document.createElement("style");
  style.textContent = readFileSync(resolve(__dirname, `../src/styles/${file}`), "utf8");
  document.head.appendChild(style);
}

describe("champion screen on the live table", () => {
  beforeEach(() => {
    states.clear();
    startSpy.mockClear();
    createTournament.mockClear();
  });
  afterEach(() => document.head.querySelectorAll("style").forEach((s) => s.remove()));

  it("covers the whole table area, not only the felt, and keeps the page header", async () => {
    loadCss("base.css");
    loadCss("winner.css");
    states.set("T1", table(0, 1));
    await renderTable();
    const cover = screen.getByTestId("tournament-winner");
    const tableWrap = screen.getByTestId("poker-table");
    expect(cover.parentElement).toBe(tableWrap);
    expect(tableWrap.querySelector(".table-felt")?.contains(cover)).toBe(false);
    expect(getComputedStyle(tableWrap).position).toBe("relative");
    const css = getComputedStyle(cover);
    expect([css.position, css.top, css.right, css.bottom, css.left]).toEqual(["absolute", "0px", "0px", "0px", "0px"]);
    expect(screen.queryByTestId("hand-result")).toBeNull();
    expect(within(screen.getByTestId("table-page")).getByRole("button", { name: /home/i })).toBeInTheDocument();
    expect(startSpy, "auto-next countdown started under the champion screen").not.toHaveBeenCalled();
  });

  it("puts CONGRATULATIONS and the username inside the plaque", async () => {
    loadCss("winner.css");
    states.set("T1", table(0, 1));
    await renderTable();
    const plaque = screen.getByTestId("tournament-winner-plaque");
    expect(within(plaque).getByTestId("tournament-winner-title")).toHaveTextContent("CONGRATULATIONS");
    expect(within(plaque).getByTestId("tournament-winner-name")).toHaveTextContent("Hero");
    const box = getComputedStyle(plaque);
    expect([box.left, box.right, box.top, box.bottom]).toEqual(["32.7%", "32.9%", "56%", "28.4%"]);
    expect(screen.queryByTestId("tournament-winner-place")).toBeNull(); // painted YOU WON stays
  });

  it("shows YOU FINISHED 3RD OF 9 when a BOT is the champion", async () => {
    states.set("T1", table(4, 3));
    await renderTable();
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Bot 4");
    expect(screen.getByTestId("tournament-winner-place")).toHaveTextContent("YOU FINISHED 3RD OF 9");
  });

  it("START NEW SESSION creates a Level 1 table with the same lineup and opens it", async () => {
    states.set("T1", table(4, 3));
    states.set("T2", { ...table(4, null), tableId: "T2", level: 1, smallBlind: 100, bigBlind: 100,
      playersRemaining: 9, phase: "playing", review: null, handNumber: 1 });
    await renderTable();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "START NEW SESSION" })));
    expect(createTournament).toHaveBeenCalledWith(10, undefined, PROFILES);
    expect(screen.queryByTestId("tournament-winner")).toBeNull();
    expect(screen.getByText(/LEVEL 1 — 100\/100/)).toBeInTheDocument();
  });
});
