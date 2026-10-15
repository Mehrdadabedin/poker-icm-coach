/* Bet sizes on the Report (plan 079): the hero's first bets per street as a
 * share of the pot, with one line about the pattern. */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ReportBetSizes } from "../src/components/ReportBetSizes";
import { sizingInsight, type SizeKey, type StreetSizes } from "../src/models/report";

const ORDER: SizeKey[] = ["under25", "third", "half", "twoThirds", "pot", "over"];
const street = (name: StreetSizes["street"], counts: number[]): StreetSizes => ({
  street: name, bets: counts.reduce((a, b) => a + b, 0),
  buckets: ORDER.map((size, i) => ({ size, count: counts[i] })),
});

const SIZES = [street("flop", [9, 2, 4, 3, 2, 0]), street("turn", [0, 1, 6, 4, 1, 0]), street("river", [0, 0, 0, 0, 0, 0])];

describe("Report bet sizes", () => {
  it("shows the share of bets at each size for the chosen street", () => {
    render(<ReportBetSizes sizes={SIZES} />);
    expect(screen.getByTestId("report-sizes-flop")).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByTestId("report-size-under25")).getByText("45%")).toBeTruthy();
    expect(screen.getByTestId("report-size-under25")).toHaveAttribute("title", "9 of 20 bets");
    expect(screen.getByTestId("report-sizes-insight").textContent).toMatch(/^Most of your flop bets are under a quarter of the pot/);
    fireEvent.click(screen.getByTestId("report-sizes-turn"));
    expect(within(screen.getByTestId("report-size-half")).getByText("50%")).toBeTruthy();
    expect(screen.getByTestId("report-sizes-insight").textContent)
      .toBe("Your most common turn bet is about half the pot (50% of your bets).");
    expect(screen.getByTestId("report-sizes-river").textContent).toBe("River (0)");
  });

  it("opens on the first street with bets", () => {
    render(<ReportBetSizes sizes={[street("flop", [0, 0, 0, 0, 0, 0]), SIZES[1], SIZES[2]]} />);
    expect(screen.getByTestId("report-sizes-turn")).toHaveAttribute("aria-pressed", "true");
  });

  it("says when there are too few bets, and when most bets are overbets", () => {
    expect(sizingInsight(street("river", [0, 1, 1, 0, 0, 0]))).toBe("Only 2 river bets so far: play more hands for a pattern.");
    expect(sizingInsight(street("turn", [0, 1, 1, 1, 2, 5]))).toMatch(/^Most of your turn bets are bigger than the pot/);
  });
});
