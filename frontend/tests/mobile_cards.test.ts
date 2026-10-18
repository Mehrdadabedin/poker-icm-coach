/* Phone layout (plan 084): the board and the hero's cards were the smallest
 * cards on a phone (32px and 40px) while face-down cards were 34px. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const mobile = readFileSync("src/styles/mobile.css", "utf8");
const portrait = mobile.slice(mobile.indexOf("@media (max-width: 767px) and (max-aspect-ratio: 4/3)"));

describe("cards on a phone held upright", () => {
  it("shows the board at 56px, or as wide as five cards fit", () => {
    expect(portrait).toMatch(/\.table-felt \.board \.playing-card \{ width: min\(56px, calc\(\(100vw - 72px\) \/ 5\)\); \}/);
  });

  it("shows the hero's cards at 60px, overlapped so three seats still fit a row", () => {
    expect(portrait).toMatch(/\.seat\.seat-hero \.seat-cards \.playing-card \{ width: 60px; \}/);
    expect(portrait).toMatch(/\.playing-card \+ \.playing-card \{ margin-left: -26px; \}/);
    expect(portrait).toMatch(/\.table-felt \.seat\.seat-hero \{ width: 104px; \}/);
  });

  it("keeps the betting controls at the bottom of the screen", () => {
    expect(portrait).toMatch(/\.hero-controls \{ position: sticky; bottom: 0;/);
  });

  it("hides the Enter hint on touch screens", () => {
    expect(readFileSync("src/styles/bet-sizer.css", "utf8")).toMatch(/@media \(hover: none\) \{ \.key-hint \{ display: none; \} \}/);
  });
});
