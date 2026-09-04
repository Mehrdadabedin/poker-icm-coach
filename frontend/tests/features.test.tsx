/* A08/A10/A13 frontend regression tests: real card assets, larger cards,
 * compact post-hand result, optional Review the Hand, return to table,
 * and login/logout. */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlayingCard } from "../src/components/PlayingCard";
import { HandResult } from "../src/components/HandResult";
import { HandReview } from "../src/components/HandReview";
import { sampleReview } from "../src/sampleState";

const review = sampleReview();

const ALL_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const ALL_SUITS = ["s", "h", "d", "c"];

describe("A08/A17 real card assets", () => {
  const SUIT_WORDS: Record<string, string> = { s: "Spades", h: "Hearts", d: "Diamonds", c: "Clubs" };

  it("maps every one of the 52 cards to the correct local asset", () => {
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const { container } = render(<PlayingCard card={{ rank, suit } as never} />);
        const img = container.querySelector("img");
        expect(img?.getAttribute("src")).toMatch(new RegExp(`cards/${rank}${suit}\.svg$`));
        expect(img?.getAttribute("alt")).toContain(SUIT_WORDS[suit]);
        expect(img?.getAttribute("alt")).toBeTruthy();
      }
    }
  });

  it("all 52 card assets exist on disk (A17 asset-completeness)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.resolve(__dirname, "../public/cards");
    for (const rank of ALL_RANKS) {
      for (const suit of ALL_SUITS) {
        const file = path.join(dir, `${rank}${suit}.svg`);
        expect(fs.existsSync(file), `missing asset ${rank}${suit}.svg`).toBe(true);
      }
    }
    expect(fs.existsSync(path.join(dir, "back.svg"))).toBe(true);
  });

  it("verifies the required A17 mapping cases: AS KH 8H 10D QC 2C", () => {
    const cases: Array<[string, string, string, string]> = [
      ["A", "s", "As", "Ace of Spades"],
      ["K", "h", "Kh", "King of Hearts"],
      ["8", "h", "8h", "8 of Hearts"],
      ["T", "d", "Td", "10 of Diamonds"],
      ["Q", "c", "Qc", "Queen of Clubs"],
      ["2", "c", "2c", "2 of Clubs"],
    ];
    for (const [rank, suit, file, expectedAlt] of cases) {
      const { container } = render(<PlayingCard card={{ rank, suit } as never} />);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toMatch(new RegExp(`cards/${file}\.svg$`));
      expect(img?.getAttribute("alt")).toBe(expectedAlt);
    }
  });

  it("renders the card back for face-down cards", () => {
    const { container } = render(<PlayingCard faceDown />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/back\.svg$/);
  });
});

describe("A10 compact result + optional review", () => {
  it("shows YOU WON with chip change", () => {
    const won = { ...review, heroWon: true, chop: false, heroNet: 4200 };
    render(<HandResult review={won} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />);
    expect(screen.getByTestId("hand-result-title")).toHaveTextContent("YOU WON");
    expect(screen.getByTestId("hand-result-subtitle")).toHaveTextContent("+4,200");
  });

  it("shows YOU LOST", () => {
    const lost = { ...review, heroWon: false, chop: false, heroNet: -1100 };
    render(<HandResult review={lost} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />);
    expect(screen.getByTestId("hand-result-title")).toHaveTextContent("YOU LOST");
  });

  it("shows CHOPPED", () => {
    const chop = { ...review, chop: true, heroNet: 0 };
    render(<HandResult review={chop} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />);
    expect(screen.getByTestId("hand-result-title")).toHaveTextContent("CHOPPED");
  });

  it("offers REVIEW THE HAND and NEXT HAND", () => {
    render(<HandResult review={review} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />);
    expect(screen.getByTestId("review-hand-btn")).toBeInTheDocument();
    expect(screen.getByTestId("next-hand-btn")).toBeInTheDocument();
  });

  it("shows paused state without advancing", () => {
    render(<HandResult review={review} onReview={() => undefined} onNext={() => undefined} countdown={9} paused />);
    expect(screen.getByTestId("result-flow")).toHaveTextContent("PAUSED");
  });
});

describe("A10 review opens only on click and returns to table", () => {
  it("clicking REVIEW THE HAND opens detailed history; BACK TO TABLE returns", () => {
    let show = false;
    const { rerender } = render(
      show ? (
        <HandReview review={review} coach={null} comparison={null} totalPlayers={9} nameBySeat={new Map()} onBack={() => { show = false; rerender(<HandResult review={review} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />); }} />
      ) : (
        <HandResult review={review} onReview={() => { show = true; rerender(<HandReview review={review} coach={null} comparison={null} totalPlayers={9} nameBySeat={new Map()} onBack={() => { show = false; rerender(<HandResult review={review} onReview={() => undefined} onNext={() => undefined} countdown={9} paused={false} />); }} />); }} onNext={() => undefined} countdown={9} paused={false} />
      ),
    );
    // initial: compact result, no detailed history
    expect(screen.getByTestId("hand-result")).toBeInTheDocument();
    expect(screen.queryByTestId("hand-review")).toBeNull();
    fireEvent.click(screen.getByTestId("review-hand-btn"));
    expect(screen.getByTestId("hand-review")).toBeInTheDocument();
    expect(screen.getByTestId("back-to-table-btn")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("back-to-table-btn"));
    expect(screen.getByTestId("hand-result")).toBeInTheDocument();
  });
});
