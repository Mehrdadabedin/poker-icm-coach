/* The coach panel says which street its advice is for (plan 075): "BET" alone
 * did not say whether to bet the flop, the turn or the river. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachPanelView } from "../src/components/CoachPanelView";

const advice = (street?: string) => ({ recommendedAction: "BET", reasoning: "Strong equity.", detail: {}, street });

describe("coach panel street label", () => {
  it.each([
    ["preflop", "preflop"], ["flop", "on the flop"], ["turn", "on the turn"], ["river", "on the river"],
  ])("names the %s next to the action", (street, label) => {
    render(<CoachPanelView coach={advice(street)} testId="coach-panel" />);
    expect(screen.getByTestId("coach-street")).toHaveTextContent(label);
    // the action stays the coach's own word: grading and the demo video read it
    expect(document.querySelector(".coach-recommendation")?.textContent).toBe("BET");
  });

  it("shows no label when the advice has no street", () => {
    render(<CoachPanelView coach={advice()} testId="coach-panel" />);
    expect(screen.queryByTestId("coach-street")).toBeNull();
  });
});
