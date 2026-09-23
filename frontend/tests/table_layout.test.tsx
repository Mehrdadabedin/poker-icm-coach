import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ActionHistory } from "../src/components/ActionHistory";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { CoachAdvice, TableAction } from "../src/models/game";

const actions: TableAction[] = [
  { seat: 3, action: "small_blind", amount: 50, street: "preflop" },
  { seat: 4, action: "big_blind", amount: 100, street: "preflop" },
  { seat: 2, action: "call", amount: 100, street: "preflop" },
];

const coach: CoachAdvice = {
  recommendedAction: "FOLD",
  reasoning: "K3o is not in the SB open range.",
  detail: { POSITION: "SB", "EFFECTIVE STACK": "30,000", "ICM PRESSURE": "high" },
};

const names = new Map<number, string>([[2, "Bot 2"], [3, "Bot 3"], [4, "Bot 4"]]);

/** HIDE / SHOW is a presentation-only fold: the panel title stays and every
 * entry returns unchanged when it is shown again. */
function HiddenSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <ActionHistory
        actions={actions}
        heroSeat={0}
        nameBySeat={names}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <CoachPanelView coach={coach} testId="coach-panel" collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
    </>
  );
}

describe("side panel HIDE / SHOW", () => {
  it("collapses and restores the hand history entries", () => {
    render(<HiddenSidebar />);
    expect(screen.getByText("HAND HISTORY")).toBeInTheDocument();
    expect(screen.getByText("PRE-FLOP")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.getByText("HAND HISTORY")).toBeInTheDocument();
    expect(screen.queryByText("PRE-FLOP")).not.toBeInTheDocument();
    expect(screen.getByTestId("history-toggle")).toHaveTextContent("SHOW ▼");
    fireEvent.click(screen.getByTestId("history-toggle"));
    expect(screen.getByText("PRE-FLOP")).toBeInTheDocument();
    expect(screen.getByTestId("history-toggle")).toHaveTextContent("HIDE ▲");
  });

  it("keeps the recommendation while the coach detail is hidden", () => {
    render(<HiddenSidebar />);
    expect(screen.getByText("ICM COACH")).toBeInTheDocument();
    expect(screen.getByText("K3o is not in the SB open range.")).toBeInTheDocument();
    expect(screen.getByText("ICM PRESSURE")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("coach-toggle"));
    expect(screen.getByText("FOLD")).toBeInTheDocument();
    expect(screen.queryByText("ICM PRESSURE")).not.toBeInTheDocument();
    expect(screen.queryByText("K3o is not in the SB open range.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("coach-toggle"));
    expect(screen.getByText("ICM PRESSURE")).toBeInTheDocument();
  });

  it("renders no toggle for callers that did not ask for one", () => {
    render(<ActionHistory actions={actions} heroSeat={0} nameBySeat={names} />);
    expect(screen.queryByTestId("history-toggle")).not.toBeInTheDocument();
    render(<CoachPanelView coach={coach} testId="review-coach-panel" />);
    expect(screen.queryByTestId("coach-toggle")).not.toBeInTheDocument();
  });
});
