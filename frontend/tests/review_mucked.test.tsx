/* Hand review: mucked opponent hands (folded, or a walk nobody had to show)
 * render as two card backs, never as fake faces. The hero's own row keeps
 * its text, and revealed hands keep their real cards. */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ShowdownHands } from "../src/components/ShowdownHands";
import type { ReviewShowdown } from "../src/models/game";

const names = new Map([[0, "Alice"], [3, "Bot 3"], [5, "Bot 5"], [6, "Bot 6"]]);

function renderReview(showdown: ReviewShowdown[], foldedSeats: number[]) {
  render(<ShowdownHands showdown={showdown} foldedSeats={foldedSeats} nameBySeat={names} heroSeat={0} />);
}

const row = (name: string) => screen.getByText(name).closest(".reveal-player") as HTMLElement;

describe("mucked opponent hands in the review", () => {
  it("shows two backs for each folded opponent, text for a folded hero", () => {
    renderReview([], [0, 3, 6]);
    for (const name of ["Bot 3", "Bot 6"]) {
      expect(within(row(name)).getAllByTestId("card-back"), `${name} folded`).toHaveLength(2);
      expect(within(row(name)).getByText("FOLDED")).toBeInTheDocument();
    }
    expect(within(row("Alice")).queryAllByTestId("card-back")).toHaveLength(0);
    expect(within(row("Alice")).getByText("Folded — hand not revealed")).toBeInTheDocument();
  });

  it("shows backs for an opponent who won a walk, real cards when revealed", () => {
    renderReview([
      { seat: 5, name: "Bot 5", cards: [], handName: null, isHero: false, won: true },
      { seat: 3, name: "Bot 3", cards: [{ rank: "K", suit: "c" }, { rank: "K", suit: "d" }],
        handName: "Pair of Kings", isHero: false, won: false },
    ], []);
    expect(within(row("Bot 5")).getAllByTestId("card-back")).toHaveLength(2);
    expect(within(row("Bot 5")).getByRole("img", { name: "Walk — hand not revealed" })).toBeInTheDocument();
    expect(within(row("Bot 3")).queryAllByTestId("card-back")).toHaveLength(0);
    expect(within(row("Bot 3")).getByTestId("card-Kc")).toBeInTheDocument();
  });
});
