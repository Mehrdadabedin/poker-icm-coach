/* Hand review facts on an upright phone (the owner, hand #72, 5 Nov): the fifth
 * board card was cut off, and the POT tile was as tall as the card tiles beside
 * it. Measured in Chromium at 360px: 5 of 5 board cards inside the tile, POT 47px
 * tall. jsdom has no layout, so this guards the rules that give that result. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { render } from "@testing-library/react";
import { HandReview } from "../src/components/HandReview";
import { sampleReview } from "../src/sampleState";

const review = readFileSync("src/styles/review.css", "utf8");
const portrait = review.slice(review.indexOf("@media (max-width: 767px) and (max-aspect-ratio: 4/3)"));

describe("hand review facts", () => {
  it("renders all five board cards in the board tile", () => {
    const { container } = render(
      <HandReview review={sampleReview()} coach={null} comparison={null} totalPlayers={9} nameBySeat={new Map()} />,
    );
    expect(container.querySelectorAll(".fact-board .playing-card")).toHaveLength(5);
    expect(container.querySelectorAll(".result-grid > .result-cell")).toHaveLength(10);
  });

  it("lets the cards shrink below the 26px floor of .card-small to fit their tile", () => {
    expect(review).toContain(".result-board-cell .playing-card { flex: 0 1 auto; min-width: 0; }");
  });

  it("puts the card tiles in one row and the pot with the other short values on a phone", () => {
    expect(portrait).toContain('"hero  hero  board board board board"');
    expect(portrait).toContain('"pot   pot   chip  chip  pos   pos"');
    for (const area of ["win", "you", "stack", "hero", "board", "pot", "chip", "pos", "rank", "icm"]) {
      expect(portrait).toContain(`grid-area: ${area};`);
    }
  });
});
