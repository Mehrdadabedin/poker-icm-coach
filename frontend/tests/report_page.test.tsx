/* REPORT (plan 078): one ready-made report. The backend computes the numbers;
 * these tests check the page asks for the right one and lays it out. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReportPage } from "../src/pages/ReportPage";
import { change, heatColour, statVerdict, type Report } from "../src/models/report";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const T = { status: "finished", endedAt: null, startingStack: 45000, hands: 3 };
const TOURNAMENTS = [
  { ...T, tableId: "c1", tableLabel: "C", startedAt: "2026-10-12T19:00:00Z", finishPlace: 2 },
  { ...T, tableId: "b1", tableLabel: "B", startedAt: "2026-10-11T19:00:00Z", finishPlace: 6 },
  { ...T, tableId: "z0", tableLabel: "Z", startedAt: "2026-10-10T19:00:00Z", finishPlace: null, hands: 0 },
];
const stat = (key: string, value: number | null, chances: number, low: number, high: number) =>
  ({ key, hits: 0, chances, value, low, high });

const REPORT: Report = {
  period: "30d", tournament: null,
  summary: { tournaments: 2, wins: 0, top3: 1, averageFinish: 4, hands: 6, decisions: 15,
    agreement: 72, mistakesPer100: 9.4, previous: { agreement: 66, mistakesPer100: 11.5 } },
  stack: { ...TOURNAMENTS[0], points: [
    { hand: 0, stack: 45000, level: 1, mistakes: 0 }, { hand: 1, stack: 52000, level: 1, mistakes: 1 },
    { hand: 2, stack: 30000, level: 2, mistakes: 0 }, { hand: 3, stack: 61000, level: 2, mistakes: 2 }] },
  heatmap: { positions: ["UTG", "CO", "SB", "BB"], streets: ["preflop", "flop", "turn", "river"], cells: [
    { position: "BB", street: "preflop", decisions: 4, mistakes: 1 },
    { position: "CO", street: "flop", decisions: 5, mistakes: 0 }] },
  leaks: [{ position: "BB", street: "preflop", heroAction: "CALL", coachAction: "FOLD", count: 3,
    hands: [{ tableId: "c1", handNumber: 3 }, { tableId: "b1", handNumber: 1 }] }],
  mistakeTypes: [{ type: "call", count: 3 }, { type: "fold", count: 1 }, { type: "allin", count: 0 }, { type: "other", count: 0 }],
  stats: [stat("vpip", 31, 40, 18, 26), stat("pfr", 17, 40, 14, 21), stat("threeBet", 2, 30, 5, 9), stat("cbet", 50, 4, 50, 70)],
  progress: [
    { ...TOURNAMENTS[1], agreement: 66, mistakesPer100: 12 },
    { ...TOURNAMENTS[0], agreement: 75, mistakesPer100: 8 }],
};

function answer(report: Report = REPORT) {
  request.mockImplementation(async (path: string) => {
    if (path === "/api/active-table") return { tableId: null };
    if (path === "/api/history/tournaments") return { tournaments: TOURNAMENTS };
    if (path.startsWith("/api/history/report")) return report;
    throw new Error(`API 404: ${path}`);
  });
}

async function open() {
  render(<MemoryRouter><ReportPage /></MemoryRouter>);
  await act(async () => undefined);
  await act(async () => undefined);
}

const verdict = (key: string) => screen.getByTestId(`report-stat-${key}`).lastElementChild?.textContent;

const reportCalls = () => request.mock.calls.map((c) => c[0] as string).filter((p) => p.startsWith("/api/history/report"));

beforeEach(() => {
  request.mockReset();
});

describe("Report page", () => {
  it("asks for the last 30 days and shows the summary with the change from before", async () => {
    answer();
    await open();
    expect(reportCalls()).toEqual(["/api/history/report?period=30d"]);
    const summary = screen.getByTestId("report-summary");
    expect(within(summary).getByText("72%")).toBeTruthy();
    expect(within(summary).getByText("▲ 6 vs previous 30 days")).toHaveClass("good");
    expect(within(summary).getByText("▼ 2.1 vs previous 30 days")).toHaveClass("good"); // fewer mistakes is good
    expect(screen.getByTestId("report-count").textContent).toBe("6 hands, 15 decisions graded by the coach");
    expect(screen.queryByTestId("report-bet-sizes")).toBeNull(); // a backend from before plan 079 sends none
  });

  it("filters by period, or by one tournament which turns the period off", async () => {
    answer();
    await open();
    const list = screen.getByTestId("report-tournament") as HTMLSelectElement;
    expect(Array.from(list.options).map((o) => o.value)).toEqual(["", "c1", "b1"]); // no table without hands
    fireEvent.change(screen.getByTestId("report-period"), { target: { value: "all" } });
    await act(async () => undefined);
    fireEvent.change(list, { target: { value: "b1" } });
    await act(async () => undefined);
    expect(reportCalls().slice(1)).toEqual(["/api/history/report?period=all", "/api/history/report?tournament=b1"]);
    expect(screen.getByTestId("report-period")).toBeDisabled();
  });

  it("draws the stack graph with a dot on each hand with a mistake", async () => {
    answer();
    await open();
    expect(screen.getByText(/^STACK GRAPH · TABLE C, /)).toBeTruthy();
    expect(screen.getByText(/Finished 2nd\.$/)).toBeTruthy();
    const dots = screen.getAllByTestId("report-stack-mistake");
    expect(dots.map((d) => d.getAttribute("title"))).toEqual([
      "Hand 1: 1 mistake, 52,000 chips after", "Hand 3: 2 mistakes, 61,000 chips after"]);
    const chart = screen.getByTestId("report-stack-chart");
    expect(within(chart).getByText("L1")).toBeTruthy();
    expect(within(chart).getByText("L2")).toBeTruthy();
    expect(within(chart).getByText("hand 3")).toBeTruthy();
  });

  it("maps mistakes by position and street, only rows with decisions", async () => {
    answer();
    await open();
    const map = screen.getByTestId("report-heatmap");
    expect(within(map).queryByText("UTG")).toBeNull();
    expect(within(screen.getByTestId("report-heat-BB")).getByText("25%")).toHaveAttribute("title", "1 of 4 decisions");
    expect(within(screen.getByTestId("report-heat-CO")).getByText("0%")).toBeTruthy();
  });

  it("lists leaks with links to the hands in Hand History, and mistakes by type", async () => {
    answer();
    await open();
    const leak = screen.getByTestId("report-leak-1");
    expect(leak.textContent).toContain("BB, preflop: CALL where the coach says FOLD");
    expect(leak.textContent).toContain("3 times");
    const links = within(leak).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Table C #3", "/history?table=c1&hand=3"], ["Table B #1", "/history?table=b1&hand=1"]]);
    expect(within(screen.getByTestId("report-type-call")).getByText("3")).toBeTruthy();
  });

  it("says where each player stat stands, and when there are too few hands to say", async () => {
    answer();
    await open();
    expect([verdict("vpip"), verdict("pfr"), verdict("threeBet"), verdict("cbet")]).toEqual(
      ["above range", "in range", "below range", "few hands (4)"]);
  });

  it("draws progress per tournament, and says when one tournament is not enough", async () => {
    answer();
    await open();
    expect(screen.getAllByTestId("report-progress-agree").map((d) => d.getAttribute("title"))).toEqual([
      "Table B: 66% coach agreement", "Table C: 75% coach agreement"]);
    answer({ ...REPORT, tournament: "c1", progress: REPORT.progress.slice(1) });
    fireEvent.change(screen.getByTestId("report-tournament"), { target: { value: "c1" } });
    await act(async () => undefined);
    expect(screen.getByTestId("report-progress-one").textContent).toBe("Choose All tournaments to see progress over time.");
  });

  it("adds the bet sizes card when the report has them (plan 079)", async () => {
    const buckets = (["under25", "third", "half", "twoThirds", "pot", "over"] as const).map((size) => ({ size, count: size === "half" ? 2 : 0 }));
    answer({ ...REPORT, betSizes: (["flop", "turn", "river"] as const).map((street) => ({ street, bets: 2, buckets })) });
    await open();
    expect(screen.getByTestId("report-bet-sizes")).toBeTruthy();
    expect(screen.getByText("BET SIZES")).toBeTruthy();
  });

  it("says so when the period has no saved tournament, and when loading fails", async () => {
    answer({ ...REPORT, summary: { ...REPORT.summary, tournaments: 0 }, stack: null });
    await open();
    expect(screen.getByTestId("report-empty")).toBeTruthy();
    expect(screen.queryByTestId("report-summary")).toBeNull();
    request.mockRejectedValue(new Error("API 500: down"));
    fireEvent.change(screen.getByTestId("report-period"), { target: { value: "7d" } });
    await act(async () => undefined);
    expect(screen.getByTestId("report-error")).toBeTruthy();
  });
});

describe("report wording", () => {
  it("compares with the period before only when there is one", () => {
    expect(change(70, 70, "7d", true)).toEqual({ text: "same as previous 7 days", good: true });
    expect(change(60, 70, "90d", true)).toEqual({ text: "▼ 10 vs previous 90 days", good: false });
    expect(change(60, null, "30d", true)).toBeNull();
    expect(change(60, 50, "all", true)).toBeNull();
  });

  it("colours a cell green with no mistakes and red from one in four", () => {
    expect(heatColour(0)).toBe("hsl(130 35% 27%)");
    expect(heatColour(0.25)).toBe("hsl(0 35% 27%)");
    expect(heatColour(0.9)).toBe("hsl(0 35% 27%)");
    expect(statVerdict(stat("vpip", null, 0, 18, 26)).text).toBe("few hands (0)");
  });
});
