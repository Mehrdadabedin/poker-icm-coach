/* The announcer regions and the clock in the DOM (plan 111). */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HandResult } from "../src/components/HandResult";
import { PokerTable } from "../src/components/PokerTable";
import { TableAnnouncer } from "../src/components/TableAnnouncer";
import { I18nProvider } from "../src/i18n/I18n";
import type { CoachAdvice, TableState } from "../src/models/game";
import { sampleReview, sampleTableState } from "../src/sampleState";

const base = (): TableState => ({ ...sampleTableState(), actionLog: [] });
const RAISE: CoachAdvice = { recommendedAction: "RAISE", reasoning: "", detail: {} };
const view = (state: TableState, coach: CoachAdvice | null = null) => (
  <I18nProvider initial="en"><TableAnnouncer state={state} coach={coach} /></I18nProvider>
);

describe("the announcer", () => {
  it("has a polite and an assertive region from the first render", () => {
    render(view(base()));
    expect(screen.getByTestId("announce-polite")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("announce-assertive")).toHaveAttribute("aria-live", "assertive");
  });

  it("holds the text of a bot action after a poll, and clears it on a poll with nothing new", () => {
    const first = base();
    const { rerender } = render(view(first));
    const raised = { ...first, actionLog: [{ seat: 2, action: "raise", amount: 2400, street: "flop" }] };
    rerender(view(raised));
    expect(screen.getByTestId("announce-polite")).toHaveTextContent("Bot 2 raises to 2,400");
    rerender(view({ ...raised, secondsLeft: raised.secondsLeft - 1 }));
    expect(screen.getByTestId("announce-polite")).toHaveTextContent("");
  });

  it("puts the hero's turn, with the coach, in the assertive region only", () => {
    const first = base();
    const { rerender } = render(view(first));
    rerender(view({ ...first, waitingForHero: true, toCall: 300, pot: 900 }, RAISE));
    expect(screen.getByTestId("announce-assertive")).toHaveTextContent("Your turn. 300 to call. Pot 900. Coach: RAISE");
    expect(screen.getByTestId("announce-polite")).toHaveTextContent("");
  });
});

describe("the other pieces", () => {
  it("the hand result is not a live region and its countdown is outside any", () => {
    render(<HandResult review={sampleReview()} onReview={() => undefined} onNext={() => undefined} countdown={4} paused={false} />);
    const flow = screen.getByTestId("result-flow");
    expect(flow.closest('[aria-live], [role="status"], [role="alert"], [role="log"]')).toBeNull();
    expect(screen.getByTestId("hand-result")).toHaveAccessibleName(/.+/);
  });

  it("the clock is a named timer that does not talk", () => {
    render(<I18nProvider initial="en"><PokerTable state={{ ...base(), level: 4, secondsLeft: 192 }} /></I18nProvider>);
    const timer = screen.getByRole("timer", { name: "Time left in level 4: 3:12" });
    expect(timer).not.toHaveAttribute("aria-live");
    expect(timer.closest("[aria-live]")).toBeNull();
  });

  it("the clock says break in a break, and is named in Spanish", () => {
    const { unmount } = render(<I18nProvider initial="en"><PokerTable state={{ ...base(), inBreak: true, secondsLeft: 60 }} /></I18nProvider>);
    expect(screen.getByRole("timer", { name: "Break, time left: 1:00" })).toBeInTheDocument();
    unmount();
    render(<I18nProvider initial="es"><PokerTable state={{ ...base(), level: 2, secondsLeft: 60 }} /></I18nProvider>);
    expect(screen.getByRole("timer", { name: "Tiempo restante del nivel 2: 1:00" })).toBeInTheDocument();
  });
});
