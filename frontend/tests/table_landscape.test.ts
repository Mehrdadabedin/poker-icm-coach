/* Phones held sideways (plan 089). At 850x390 the buttons sat below the
 * screen, there was no coach card, and the hero's cards were 24px wide. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const css = readFileSync("src/styles/table-landscape.css", "utf8");
const block = css.slice(css.indexOf("@media (max-width: 959px) and (min-aspect-ratio: 5/4)"));

describe("the table on a phone held sideways", () => {
  it("puts the table on the left and the coach card and buttons in a column on its right", () => {
    expect(block).toMatch(/grid-template-columns: minmax\(0, 1fr\) min\(300px, 36vw\);/);
    expect(block).toMatch(/grid-template-areas: "info info" "felt coach" "felt controls" "felt extra";/);
    expect(block).toMatch(/\.table-wrap > \.mobile-coach \{ grid-area: coach; display: block;/);
    expect(block).toMatch(/\.table-wrap > \.hero-controls,\n\s*\.table-wrap > \.hand-result \{ grid-area: controls;/);
  });

  it("gives the table the full height under a slim header", () => {
    expect(block).toMatch(/height: calc\(100vh - 66px\);/);
    expect(block).toContain(".table-wrap > .table-status { display: none; }");
    expect(block).toMatch(/\.app-header\.table-header \.brand-logo \{ height: 30px;/);
  });

  it("shows the hero's cards at 44px and the board at 42px (were 24 and 38)", () => {
    expect(block).toContain(".table-felt .seat.seat-hero .seat-cards .playing-card { width: 44px; }");
    expect(block).toContain(".table-felt .board .playing-card { width: 42px; }");
  });

  it("is loaded after the phone styles it overrides", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    const order = ["mobile.css", "table-menu.css", "table-landscape.css"].map((f) => main.indexOf(`styles/${f}`));
    expect(order.every((at) => at > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(readFileSync("src/styles/mobile.css", "utf8")).not.toContain("min-aspect-ratio: 5/4");
  });
});
