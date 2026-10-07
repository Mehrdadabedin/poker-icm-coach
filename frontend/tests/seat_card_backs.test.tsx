/* Face-down cards on the felt: every BOT still in the hand shows two card
 * backs; folded and busted seats show none; real cards replace the backs at
 * showdown. The backend never sends a BOT's hole cards before showdown. */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PokerTable } from "../src/components/PokerTable";
import { sampleReview, sampleTableState } from "../src/sampleState";

const backs = (seat: number) => within(screen.getByTestId(`seat-${seat}`)).queryAllByTestId("card-back");

function liveTable() {
  const state = sampleTableState();
  state.players = state.players.map((p) => {
    if (p.seat === 2) return { ...p, folded: true };
    if (p.seat === 3) return { ...p, stack: 0, sitsOut: true };
    return p;
  });
  return state;
}

describe("BOT card backs on the table", () => {
  it("shows two backs for each BOT still in the hand", () => {
    render(<PokerTable state={liveTable()} />);
    for (const seat of [1, 4, 5, 6, 7, 8]) {
      expect(backs(seat), `seat ${seat} is in the hand`).toHaveLength(2);
    }
  });

  it("shows no backs for folded or busted seats, and real cards for the hero", () => {
    render(<PokerTable state={liveTable()} />);
    expect(backs(2), "folded seat").toHaveLength(0);
    expect(screen.queryByTestId("seat-3")).toBeNull(); // busted BOT left the felt (A43)
    expect(backs(0)).toHaveLength(0);
    expect(within(screen.getByTestId("seat-0")).getByTestId("card-As")).toBeInTheDocument();
  });

  it("replaces the backs with the real cards at showdown", () => {
    const review = sampleReview();
    review.foldedSeats = [2, 4, 6, 7, 8];
    review.showdown = [
      ...review.showdown,
      { seat: 1, name: "Bot 1", cards: [{ rank: "Q", suit: "d" }, { rank: "Q", suit: "s" }],
        handName: "Pair of Queens", isHero: false, won: false },
      { seat: 5, name: "Bot 5", cards: [], handName: null, isHero: false, won: false },
    ];
    const state = { ...liveTable(), phase: "handOver" as const, review };
    render(<PokerTable state={state} />);
    const seat1 = within(screen.getByTestId("seat-1"));
    expect(seat1.getByTestId("card-Qd")).toBeInTheDocument();
    expect(seat1.getByTestId("card-Qs")).toBeInTheDocument();
    expect(backs(1)).toHaveLength(0);
    expect(backs(5), "unrevealed hand keeps its backs").toHaveLength(2);
  });
});
