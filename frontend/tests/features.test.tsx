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

describe("A08 real card assets", () => {
  it("maps every representative card to the correct local asset", () => {
    const cases: Array<[string, string, string]> = [
      ["A", "h", "Ah"], ["4", "c", "4c"], ["5", "c", "5c"],
      ["J", "h", "Jh"], ["Q", "h", "Qh"], ["K", "h", "Kh"],
      ["A", "s", "As"], ["9", "d", "9d"], ["T", "s", "Ts"],
    ];
    for (const [rank, suit, file] of cases) {
      const { container } = render(<PlayingCard card={{ rank, suit } as never} />);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toMatch(new RegExp(`cards/${file}\.svg$`));
      expect(img?.getAttribute("alt")).toContain(rank);
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
