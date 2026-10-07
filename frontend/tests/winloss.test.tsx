import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActionHistory } from "../src/components/ActionHistory";
import { TableSidebar } from "../src/components/TableSidebar";
import { HandHistoryEntry, TableAction } from "../src/models/game";

// TableSidebar fetches /api/game/{tableId}/hands through services/api.request.
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const actions: TableAction[] = [
  { seat: 2, action: "call", amount: 100, street: "preflop" },
  { seat: 3, action: "fold", amount: null, street: "preflop" },
];
const names = new Map<number, string>([[2, "Bot 2"], [3, "Bot 3"]]);

function hand(over: Partial<HandHistoryEntry>): HandHistoryEntry {
  return {
    handNumber: 1, heroPosition: "UTG", pot: 1000, winnerSeats: [0], stage: "",
    net: 100, heroDecision: "CALL", coachRecommendation: "CALL", grade: "PREFERRED",
    level: 1, blindLevel: "100/100", ...over,
  };
}

const hands = [hand({ net: 100 }), hand({ net: -50, level: 1 }), hand({ net: 75, heroPosition: "MP", level: 2 })];

function Panel() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<"history" | "analysis">("history");
  return (
    <ActionHistory
      actions={actions}
      heroSeat={0}
      nameBySeat={names}
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
      view={view}
      onViewChange={setView}
      hands={hands}
      currentLevel={2}
    />
  );
}

const switchTo = (value: string) =>
  fireEvent.change(screen.getByTestId("history-view-select"), { target: { value } });

describe("hand history panel two-view switch (A18)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to HAND HISTORY: OVERALL PERFORMANCE on top, the history under it", () => {
    render(<Panel />);
    expect(screen.getByTestId("history-view-select")).toHaveValue("history");
    const overall = screen.getByTestId("wl-overall");
    expect(overall).toHaveTextContent("OVERALL PERFORMANCE");
    expect(screen.getByTestId("wl-total-hands")).toHaveTextContent("3");
    expect(screen.getByTestId("wl-wins")).toHaveTextContent("2");
    expect(screen.getByTestId("wl-losses")).toHaveTextContent("1");
    expect(screen.getByTestId("wl-win-rate")).toHaveTextContent("67%");
    expect(screen.getByTestId("wl-profit")).toHaveTextContent("+125 chips");
    const preflop = screen.getByText("PRE-FLOP");
    expect(overall.compareDocumentPosition(preflop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Bot 2", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("RESULTS BY POSITION", { selector: "h4" })).toBeNull();
    expect(screen.queryByTestId("wl-blind-levels")).toBeNull();
  });

  it("offers exactly the two view options", () => {
    render(<Panel />);
    const options = screen.getByTestId("history-view-select").querySelectorAll("option");
    expect([...options].map((o) => o.textContent)).toEqual(["HAND HISTORY", "RESULTS BY POSITION"]);
  });

  it("RESULTS BY POSITION shows both breakdowns without OVERALL PERFORMANCE", () => {
    render(<Panel />);
    switchTo("analysis");
    expect(screen.getByTestId("wl-positions")).toHaveTextContent("RESULTS BY POSITION");
    expect(screen.getByTestId("wl-position-MP")).toBeInTheDocument();
    expect(screen.getByTestId("wl-blind-levels")).toHaveTextContent("WIN / LOSE BY BLIND LEVEL");
    expect(screen.getByTestId("wl-level-2")).toHaveAttribute("data-current", "true");
    expect(screen.queryByTestId("wl-overall")).toBeNull();
    expect(screen.queryByText("PRE-FLOP")).toBeNull();
  });

  it("returns to the same Hand History when selected again", () => {
    render(<Panel />);
    switchTo("analysis");
    switchTo("history");
    expect(screen.getByTestId("history-view-select")).toHaveValue("history");
    expect(screen.getByText("PRE-FLOP")).toBeInTheDocument();
    expect(screen.queryByTestId("win-lose-analysis")).not.toBeInTheDocument();
  });

  it("HIDE folds the default view, OVERALL PERFORMANCE included", () => {
    render(<Panel />);
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.queryByTestId("wl-overall")).toBeNull();
    expect(screen.queryByText("PRE-FLOP")).toBeNull();
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.getByTestId("wl-overall")).toBeInTheDocument();
  });

  it("keeps HIDE / SHOW on both views: body folds, head with selector stays", () => {
    render(<Panel />);
    switchTo("analysis");
    expect(screen.getByTestId("win-lose-analysis")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.queryByTestId("win-lose-analysis")).not.toBeInTheDocument();
    expect(screen.getByTestId("history-view-select")).toBeInTheDocument();
    expect(screen.getByTestId("history-toggle")).toHaveTextContent("SHOW ▼");
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.getByTestId("win-lose-analysis")).toBeInTheDocument();
  });

  it("handles empty and loading analytics data cleanly", () => {
    render(
      <ActionHistory actions={actions} heroSeat={0} nameBySeat={names}
        view="analysis" onViewChange={() => undefined} hands={[]} />,
    );
    expect(screen.getByTestId("wl-empty")).toBeInTheDocument();
  });
});

describe("TableSidebar fetch (A18)", () => {
  beforeEach(() => request.mockReset());

  const sidebar = (handNumber: number) => (
    <TableSidebar actions={actions} heroSeat={0} nameBySeat={names} coach={null}
      tableId="t-1" handNumber={handNumber} currentLevel={2} />
  );

  it("fetches once per hand for the default view, not per poll or view switch", async () => {
    request.mockResolvedValue({ hands });
    const { rerender } = render(sidebar(2));
    await waitFor(() => expect(screen.getByTestId("wl-overall")).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("/api/game/t-1/hands");

    rerender(sidebar(2)); // a 350 ms poll with the same hand
    rerender(sidebar(2));
    fireEvent.change(screen.getByTestId("history-view-select"), { target: { value: "analysis" } });
    expect(screen.getByTestId("win-lose-analysis")).toBeInTheDocument();
    expect(request, "refetched without a new hand").toHaveBeenCalledTimes(1);

    rerender(sidebar(3));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });
});
