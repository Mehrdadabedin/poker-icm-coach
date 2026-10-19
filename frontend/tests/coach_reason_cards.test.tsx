/* The hero's cards in the coach's reason (the owner, 19 Oct): "83o is not in
 * the LJ open range" shows the two cards as chips, like My Mistakes. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { CoachReason, handClass } from "../src/components/CoachReason";
import type { Card } from "../src/models/game";

const c = (text: string): Card => ({ rank: text[0], suit: text[1] as Card["suit"] });

describe("the hero's cards in the coach's reason", () => {
  it("names hands the way the coach writes them", () => {
    expect(handClass([c("8h"), c("3c")])).toBe("83o");
    expect(handClass([c("Qs"), c("Ks")])).toBe("KQs");
    expect(handClass([c("9d"), c("9c")])).toBe("99");
    expect(handClass([c("Th"), c("Ad")])).toBe("ATo");
  });

  it("shows the two cards in place of the shorthand, red for hearts", () => {
    render(<p data-testid="why"><CoachReason text="83o is not in the LJ open range." cards={[c("8h"), c("3c")]} /></p>);
    expect(screen.getByTestId("why")).toHaveTextContent("8♥3♣ is not in the LJ open range.");
    const chips = screen.getByTestId("reason-cards").children;
    expect(chips[0]).toHaveClass("mistake-card", "mistake-card-red");
    expect(chips[1]).not.toHaveClass("mistake-card-red");
  });

  it("leaves numbers and other hands alone", () => {
    render(<p data-testid="why"><CoachReason text="Equity 45% beats the pot odds 44%; 45s would too." cards={[c("5h"), c("4c")]} /></p>);
    expect(screen.queryByTestId("reason-cards")).toBeNull();
    expect(screen.getByTestId("why")).toHaveTextContent("Equity 45% beats the pot odds 44%; 45s would too.");
  });

  it("finds the hand at the end of a sentence too, and keeps the text without cards", () => {
    render(<p data-testid="a"><CoachReason text="Strong equity 70% on AKs." cards={[c("As"), c("Ks")]} /></p>);
    expect(screen.getByTestId("a")).toHaveTextContent("Strong equity 70% on A♠K♠.");
    render(<p data-testid="b"><CoachReason text="83o is not in the LJ open range." /></p>);
    expect(screen.getByTestId("b")).toHaveTextContent("83o is not in the LJ open range.");
  });

  it("is what the coach panel shows, with the chips sized for a line of text", () => {
    render(<CoachPanelView testId="coach-panel" heroCards={[c("Kh"), c("2h")]}
      coach={{ recommendedAction: "FOLD", street: "preflop", reasoning: "K2s is not in the LJ open range.", detail: {} }} />);
    expect(screen.getByTestId("coach-panel")).toHaveTextContent("K♥2♥ is not in the LJ open range.");
    expect(readFileSync("src/styles/coach-panel.css", "utf8")).toContain(".reason-cards .mistake-card { min-width: 0;");
  });
});
