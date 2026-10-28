/* The coach card on phones (plan 087): on a phone the coach panel sat below
 * the table, a long scroll away from the buttons. The card shows the advice
 * at the top of the felt on the hero's turn only. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { LiveTableView, type LiveTableViewProps } from "../src/components/LiveTableView";
import type { CoachAdvice, TableState } from "../src/models/game";
import { sampleReview, sampleTableState } from "../src/sampleState";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // never answers: the side panel's hand list is not under test here
  request: vi.fn(() => new Promise(() => undefined)),
}));

const advice: CoachAdvice = {
  recommendedAction: "FOLD", reasoning: "Equity 22% below required 31%.", street: "flop",
  detail: { "Pot odds": "31%", SPR: "4.2", "ICM pressure": "LOW" },
};

const noop = () => undefined;

function view(state: Partial<TableState>, extra: Partial<LiveTableViewProps> = {}) {
  const props: LiveTableViewProps = {
    state: { ...sampleTableState(), waitingForHero: true, ...state }, coach: advice,
    comparison: null, countdown: null, paused: false, acting: false, showLabels: false,
    showResultLabels: false, nameBySeat: new Map(), coachCollapsed: false,
    reviewOpen: false, username: "Alice", onHome: noop, onMistakes: noop, onLogout: noop,
    onTogglePause: noop, onReview: noop, onNext: noop, onBackReview: noop, onAction: noop,
    onToggleCoach: noop, ...extra,
  };
  return render(<LiveTableView {...props} />);
}

describe("coach card on phones", () => {
  it("shows the advice right before the felt on the hero's turn", () => {
    view({});
    const card = screen.getByTestId("mobile-coach");
    // outside the felt since plan 089, so a phone held sideways can put it beside the table
    expect(card.nextElementSibling).toHaveClass("table-felt");
    expect(card).toHaveTextContent("ICM COACH · FLOP");
    expect(screen.getByTestId("mobile-coach-action")).toHaveTextContent("FOLD");
    expect(screen.getByTestId("mobile-coach-action")).toHaveClass("act-fold");
    expect(card).toHaveTextContent("Equity 22% below required 31%.");
  });

  it.each([
    ["it is not the hero's turn", { waitingForHero: false }, {}],
    ["the hero's action is on its way", {}, { acting: true }],
    ["the advice is for an earlier street", { street: "turn" as const }, {}],
    ["the hand is over", { phase: "handOver" as const, review: sampleReview() }, {}],
    ["there is no advice", {}, { coach: null }],
  ])("is gone when %s", (_why, state, extra) => {
    view(state, extra);
    expect(screen.queryByTestId("mobile-coach")).toBeNull();
  });

  it("opens and closes the details rows", () => {
    view({});
    const more = screen.getByTestId("mobile-coach-details");
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".mobile-coach-rows")).toBeNull();
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelectorAll(".mobile-coach-rows > div")).toHaveLength(3);
    expect(screen.getByTestId("mobile-coach")).toHaveTextContent("SPR4.2");
    fireEvent.click(more);
    expect(document.querySelector(".mobile-coach-rows")).toBeNull();
  });

  it("marks the board empty preflop, so the card takes its place", () => {
    view({ street: "preflop", communityCards: [] }, { coach: { ...advice, street: "preflop" } });
    expect(document.querySelector(".board")).toHaveClass("board-is-empty");
  });

  it("is shown on phones only, and upright replaces only an empty board", () => {
    const css = readFileSync("src/styles/coach-mobile.css", "utf8");
    expect(css).toMatch(/^\.mobile-coach \{\n\s*display: none;/m);
    const phone = css.slice(css.indexOf("@media (max-width: 767px) and (max-aspect-ratio: 4/3)"));
    expect(phone).toContain(".table-wrap > .mobile-coach { display: block; margin: 0 0 6px; }");
    expect(phone).toContain(".table-wrap:has(> .mobile-coach) .board.board-is-empty { display: none; }");
    // sideways it sits beside the table: tests/table_landscape.test.ts
    expect(readFileSync("src/main.tsx", "utf8")).toContain('import "./styles/coach-mobile.css";');
  });
});
