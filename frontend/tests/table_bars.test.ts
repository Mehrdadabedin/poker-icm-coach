/* The two lines over the table and the seat labels (the owner, 4 Nov): the hand line was a solid
 * band over the felt, level/time/pot sat on the left, and FOLDED, BB and the action tags were 9px. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const desktop = readFileSync("src/styles/table-desktop.css", "utf8");
const phone = readFileSync("src/styles/table-phone.css", "utf8");
const seats = readFileSync("src/styles/table-seats.css", "utf8");

describe("the lines over the table", () => {
  it("draws the hand line see-through like the history panel, on wide screens and phones", () => {
    for (const css of [desktop, phone]) {
      expect(css).toMatch(/\.table-wrap > \.table-status \{[^}]*background: var\(--history-panel-bg\); backdrop-filter: blur\(8px\);/);
    }
  });

  it("centres level, time and pot between two equal columns, the round buttons in the right one", () => {
    expect(desktop).toContain("grid-template-columns: minmax(64px, 1fr) repeat(3, auto) minmax(64px, 1fr);");
    expect(desktop).toContain(".table-wrap > .table-header > .tbl-info:first-child { grid-column: 2; }");
    expect(desktop).toContain(".table-wrap > .table-header > .tbl-chips { grid-column: 5; justify-self: end; }");
    expect(desktop).toMatch(/font-size: 0\.875rem; white-space: nowrap;/);
  });

  it("keeps the line on the left on a table too narrow for the longest level", () => {
    expect(desktop).toMatch(/@container \(max-width: 700px\) \{\n\s*\.table-wrap > \.table-header \{ grid-template-columns: repeat\(3, auto\) minmax\(64px, 1fr\);/);
  });
});

describe("seat labels for weaker eyes", () => {
  it("are bigger at rest, not on hover", () => {
    expect(seats).toContain("font-size: clamp(8px, 1.5cqw, 13px);");
    expect(seats).toContain(".table-felt .seat :is(.seat-fold-label, .seat-out-label, .seat-status, .seat-reveal-hand) { font-size: max(0.6rem, 0.85em); }");
    expect(phone).toContain(".table-felt .seat .seat-bb { font-size: 0.95em; }");
    expect(seats + phone).not.toMatch(/:hover/);
  });

  it("puts the top seat below the hand line but never onto the board", () => {
    expect(seats).toContain('.seat[data-seat="0"] { left: 50%; top: clamp(18%, calc(14px + 7em), calc(50% - 53px - 7em)); }');
  });
});
