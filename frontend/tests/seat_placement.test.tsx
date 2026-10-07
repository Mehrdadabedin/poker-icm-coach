import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { PokerTable } from "../src/components/PokerTable";
import { sampleTableState } from "../src/sampleState";

const placementCss = readFileSync(resolve(__dirname, "../src/styles/placement.css"), "utf8");

function renderWithPlacement(eliminated: number[]) {
  const style = document.createElement("style");
  style.textContent = placementCss;
  document.head.appendChild(style);
  const state = sampleTableState();
  state.players = state.players.map((p) => (eliminated.includes(p.seat) ? { ...p, sitsOut: true } : p));
  render(<PokerTable state={state} />);
  return style;
}

const position = (seat: number) => {
  const css = getComputedStyle(screen.getByTestId(`seat-${seat}`));
  return { left: css.left, top: css.top };
};

describe("seat placement (A43 follow-up)", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll("style").forEach((s) => s.remove());
  });

  it("keeps seat 4 at seat 4's position when seat 3 is eliminated", () => {
    renderWithPlacement([]);
    const full = { 4: position(4), 8: position(8) };
    cleanup();

    renderWithPlacement([3]);
    expect(screen.queryByTestId("seat-3")).toBeNull();
    expect(position(4), "seat 4 moved after seat 3 left the DOM").toEqual(full[4]);
    expect(position(8)).toEqual(full[8]);
    expect(position(4)).toEqual({ left: "64.4%", top: "81.5%" });
  });
});
