/* Hand History (plan 077): the user's saved tournaments in a list instead of a
 * table id box, winners by name instead of seat numbers, and filters. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HistoryPage } from "../src/pages/HistoryPage";
import { ordinal } from "../src/models/history";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const NAMES = ["meaantonio38", "Alex 1", "Sarah 1", "David 1", "Emma 1", "Sarah 2", "Alex 2", "David 2", "Emma 2"];
const hand = (n: number, net: number, extra: Record<string, unknown> = {}) => ({
  handNumber: n, heroPosition: "CO", pot: 1000, winnerSeats: net > 0 ? [0] : [5], seatNames: NAMES,
  net, heroDecision: "CALL", coachRecommendation: "FOLD", grade: net > 0 ? "PREFERRED" : "SUBOPTIMAL",
  level: 1, blindLevel: "100/100", ...extra,
});
const LIVE = [hand(1, 320), hand(2, -1100, { heroPosition: "BTN" }), hand(3, 0, { level: 2, blindLevel: "100/200", grade: "ACCEPTABLE" })];
const OLD = [hand(1, -300, { seatNames: undefined, winnerSeats: [3] })];
const SAVED = [
  { tableId: "live1", tableLabel: "B", startedAt: "2026-10-13T16:20:00Z", endedAt: null, status: "active", finishPlace: null, hands: 3 },
  { tableId: "old1", tableLabel: "A", startedAt: "2026-10-12T19:05:00Z", endedAt: "2026-10-12T21:00:00Z", status: "finished", finishPlace: 5, hands: 1 },
  { tableId: "lost1", tableLabel: "C", startedAt: "2026-10-11T10:00:00Z", endedAt: null, status: "active", finishPlace: null, hands: 7 },
];

function answer(liveId: string | null, saved: unknown[]) {
  request.mockImplementation(async (path: string) => {
    if (path === "/api/active-table") return { tableId: liveId, tableLabel: liveId ? "B" : null };
    if (path === "/api/history/tournaments") return { tournaments: saved };
    if (path === `/api/game/${liveId}/hands`) return { hands: LIVE };
    if (path === "/api/history/tournaments/old1/hands") return { hands: OLD };
    throw new Error(`API 404: ${path}`);
  });
}

async function open() {
  render(<MemoryRouter><HistoryPage /></MemoryRouter>);
  await act(async () => undefined);
  await act(async () => undefined);
}

const rows = () => screen.queryAllByTestId(/^history-hand-/).map((r) => r.getAttribute("data-testid"));

beforeEach(() => {
  request.mockReset();
});

describe("Hand History", () => {
  it("lists the user's tournaments, the live one first and selected, instead of a table id box", async () => {
    answer("live1", SAVED);
    await open();
    expect(screen.queryByTestId("history-table-input")).toBeNull();
    const list = screen.getByTestId("history-tournament") as HTMLSelectElement;
    const labels = Array.from(list.options).map((o) => o.textContent ?? "");
    expect(list.value).toBe("live1");
    expect(labels[0]).toMatch(/^Table B · .* · in progress · 3 hands$/);
    expect(labels[1]).toMatch(/^Table A · .* · finished 5th · 1 hand$/);
    expect(labels[2]).toMatch(/· unfinished · 7 hands$/); // its table ended at a deploy
    expect(request).toHaveBeenCalledWith("/api/game/live1/hands");
    expect(rows()).toEqual(["history-hand-1", "history-hand-2", "history-hand-3"]);
  });

  it("shows winners by name, and falls back to the seat for hands saved before names", async () => {
    answer("live1", SAVED);
    await open();
    expect(within(screen.getByTestId("history-hand-1")).getByText("You")).toBeTruthy();
    expect(within(screen.getByTestId("history-hand-2")).getByText("Sarah 2")).toBeTruthy();
    fireEvent.change(screen.getByTestId("history-tournament"), { target: { value: "old1" } });
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith("/api/history/tournaments/old1/hands");
    expect(within(screen.getByTestId("history-hand-1")).getByText("Seat 3")).toBeTruthy();
  });

  it("filters by result, mistakes, position and level", async () => {
    answer("live1", SAVED);
    await open();
    fireEvent.change(screen.getByTestId("history-filter-result"), { target: { value: "won" } });
    expect(rows()).toEqual(["history-hand-1"]);
    fireEvent.change(screen.getByTestId("history-filter-result"), { target: { value: "lost" } });
    expect(rows()).toEqual(["history-hand-2"]);
    fireEvent.change(screen.getByTestId("history-filter-result"), { target: { value: "all" } });
    fireEvent.click(screen.getByTestId("history-filter-mistakes"));
    expect(rows()).toEqual(["history-hand-2"]);
    fireEvent.click(screen.getByTestId("history-filter-mistakes"));
    fireEvent.change(screen.getByTestId("history-filter-position"), { target: { value: "BTN" } });
    expect(rows()).toEqual(["history-hand-2"]);
    fireEvent.change(screen.getByTestId("history-filter-position"), { target: { value: "" } });
    fireEvent.change(screen.getByTestId("history-filter-level"), { target: { value: "2" } });
    expect(rows()).toEqual(["history-hand-3"]);
    expect(screen.getByTestId("history-count").textContent).toBe("1 of 3 hands match the filters");
  });

  it("still shows the live table where no history is saved", async () => {
    answer("live1", []);
    await open();
    expect((screen.getByTestId("history-tournament") as HTMLSelectElement).value).toBe("live1");
    expect(rows()).toHaveLength(3);
  });

  it("says so when there is nothing yet", async () => {
    answer(null, []);
    await open();
    expect(screen.getByTestId("history-none")).toBeTruthy();
  });

  it("opens the tournament and marks the hand a Report leak links to (plan 078)", async () => {
    answer("live1", SAVED);
    render(<MemoryRouter initialEntries={["/history?table=old1&hand=1"]}><HistoryPage /></MemoryRouter>);
    await act(async () => undefined);
    await act(async () => undefined);
    expect((screen.getByTestId("history-tournament") as HTMLSelectElement).value).toBe("old1");
    expect(screen.getByTestId("history-hand-1")).toHaveClass("history-focus");
    fireEvent.change(screen.getByTestId("history-tournament"), { target: { value: "live1" } });
    await act(async () => undefined);
    expect(screen.getByTestId("history-hand-1")).not.toHaveClass("history-focus");
  });

  it("writes places as 1st, 2nd, 3rd, 11th, 22nd", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});
