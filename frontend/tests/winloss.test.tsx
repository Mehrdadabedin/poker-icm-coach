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

  it("keeps HAND HISTORY as the default and renders the existing entries", () => {
    render(<Panel />);
    expect(screen.getByTestId("history-view-select")).toHaveValue("history");
    expect(screen.getByText("PRE-FLOP")).toBeInTheDocument();
    expect(screen.getByText("Bot 2", { exact: false })).toBeInTheDocument();
    expect(screen.queryByTestId("win-lose-analysis")).not.toBeInTheDocument();
  });

  it("offers exactly the two view options", () => {
    render(<Panel />);
    const options = screen.getByTestId("history-view-select").querySelectorAll("option");
    expect([...options].map((o) => o.textContent)).toEqual(["HAND HISTORY", "WIN / LOSE ANALYSIS"]);
  });

  it("shows real-data analytics when WIN / LOSE ANALYSIS is selected", () => {
    render(<Panel />);
    switchTo("analysis");
    expect(screen.getByTestId("win-lose-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("wl-overall")).toBeInTheDocument();
    expect(screen.getByTestId("wl-total-hands")).toHaveTextContent("3");
    expect(screen.getByTestId("wl-wins")).toHaveTextContent("2");
    expect(screen.getByTestId("wl-losses")).toHaveTextContent("1");
    expect(screen.getByTestId("wl-win-rate")).toHaveTextContent("67%");
    expect(screen.getByTestId("wl-profit")).toHaveTextContent("+125 chips");
    expect(screen.getByTestId("wl-level-2")).toHaveAttribute("data-current", "true");
    expect(screen.getByTestId("wl-position-MP")).toBeInTheDocument();
  });

  it("returns to the same Hand History when selected again", () => {
    render(<Panel />);
    switchTo("analysis");
    switchTo("history");
    expect(screen.getByTestId("history-view-select")).toHaveValue("history");
    expect(screen.getByText("PRE-FLOP")).toBeInTheDocument();
    expect(screen.queryByTestId("win-lose-analysis")).not.toBeInTheDocument();
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

  it("fetches the owner's hands only for the analysis view, one read-only GET", async () => {
    request.mockResolvedValue({ hands });
    render(<TableSidebar actions={actions} heroSeat={0} nameBySeat={names} coach={null}
      tableId="t-1" handNumber={2} currentLevel={2} />);
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("history-view-select"), { target: { value: "analysis" } });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls[0][0]).toBe("/api/game/t-1/hands");
    await waitFor(() => expect(screen.getByTestId("win-lose-analysis")).toBeInTheDocument());
  });
});
