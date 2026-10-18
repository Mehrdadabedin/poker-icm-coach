/* The logo on the cloth (plan 090): with no cards on the board, the table shows
 * the ICMBOT logo, faint, where a "DEALING…" label sat in a dark box. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { inflateSync } from "zlib";
import { PokerTable } from "../src/components/PokerTable";
import { sampleTableState } from "../src/sampleState";

describe("the logo on the table", () => {
  it("shows while the board is empty, as decoration only", () => {
    render(<PokerTable state={{ ...sampleTableState(), communityCards: [] }} />);
    const logo = screen.getByTestId("felt-logo");
    expect(logo).toHaveAttribute("src", "/Logo/logo-felt.png");
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("DEALING…")).toBeNull();
  });

  it("gives way to the cards once they are dealt", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.queryByTestId("felt-logo")).toBeNull();
    expect(screen.getByTestId("card-9c")).toBeInTheDocument();
  });

  it("is a quarter of the table wide, faint, behind the seats, on a transparent background", () => {
    const css = readFileSync("src/styles/felt.css", "utf8");
    expect(css).toMatch(/\.felt-logo \{\n\s*display: block; width: clamp\(90px, 25cqw, 280px\);/);
    expect(css).toMatch(/opacity: 0\.3;/);
    expect(css).toContain(".board.board-is-empty { background: none; padding: 0; z-index: -1; }");
    expect(css).toContain(".table-felt { container-type: inline-size; isolation: isolate; }");
  });

  it("uses a logo file whose corners are see-through (logo.png is black there)", () => {
    // PNG header: colour type 6 is RGBA; the first pixel's alpha follows the
    // filter byte of row 0 in the inflated image data
    const png = readFileSync("public/Logo/logo-felt.png");
    expect(png.readUInt8(25)).toBe(6);
    const chunks: Buffer[] = [];
    for (let at = 8; at < png.length;) {
      const length = png.readUInt32BE(at);
      if (png.toString("ascii", at + 4, at + 8) === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + length));
      at += 12 + length;
    }
    const pixels = inflateSync(Buffer.concat(chunks));
    expect(pixels.readUInt8(4)).toBe(0);
  });
});
