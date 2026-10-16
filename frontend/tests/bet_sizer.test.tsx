/* Betting controls (plan 081): sizes that fit the street, two taps or Enter
 * to bet, - and + instead of typing, FOLD greyed out when checking is free. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HeroControls } from "../src/components/HeroControls";
import type { LegalAction, TableAction } from "../src/models/game";
import { preflopRaises, presets, type SizingInput } from "../src/models/betSizing";

const RAISE = (min: number, max = 45_450): LegalAction[] => [
  { kind: "fold" }, { kind: "call" }, { kind: "raise", minAmount: min, maxAmount: max }, { kind: "all_in", amount: max }];
const raise = (seat: number, amount: number): TableAction => ({ seat, action: "raise", amount, street: "preflop" });

function table(props: Partial<Parameters<typeof HeroControls>[0]>) {
  const onAction = vi.fn();
  render(<HeroControls legalActions={RAISE(200)} toCall={100} pot={150} stack={45_450} bigBlind={100}
    disabled={false} street="preflop" heroBet={0} actionLog={[]} onAction={onAction} {...props} />);
  return onAction;
}
const labels = () => screen.getAllByTestId(/^size-(?!play|range|minus|plus)/).map((b) => b.textContent);
const play = () => screen.getByTestId("size-play");

describe("preflop sizes in big blinds", () => {
  it("first in: 2x, 2.5x, 3x and all-in, no pot button; 2.5x to start", () => {
    const onAction = table({});
    expect(labels()).toEqual(["2x200", "2.5x250", "3x300", "All-in45,450"]);
    expect(play().textContent).toBe("RAISE TO 2502.5 BB · Enter");
    fireEvent.click(screen.getByTestId("size-plus"));
    fireEvent.click(play());
    expect(onAction).toHaveBeenCalledWith("raise", 350);  // + is one big blind
  });

  it("facing a raise to 250: a 3-bet of 3x, 3.5x or 4x that raise, 3x to start", () => {
    table({ legalActions: RAISE(400), toCall: 250, pot: 400, actionLog: [raise(3, 250)] });
    expect(labels()).toEqual(["3x750", "3.5x875", "4x1,000", "All-in45,450"]);
    expect(screen.getByTestId("size-3x")).toHaveAttribute("aria-pressed", "true");
  });

  it("facing a 3-bet: 2.2x or 2.5x, counting the hero's own open", () => {
    expect(preflopRaises([raise(0, 250), raise(5, 750)], 100)).toBe(2);
    table({ legalActions: RAISE(1250), toCall: 500, heroBet: 250, pot: 1150, actionLog: [raise(0, 250), raise(5, 750)] });
    expect(labels()).toEqual(["2.2x1,650", "2.5x1,875", "All-in45,450"]);
  });
});

describe("sizes after the flop as a share of the pot", () => {
  const flop: SizingInput = { street: "flop", toCall: 0, pot: 1000, bigBlind: 100, heroBet: 0, raises: 0, min: 100, max: 44_700 };

  it("bets 1/3, 1/2, 2/3 or the pot; 1/2 to start; Enter plays it", () => {
    const onAction = table({ street: "flop", toCall: 0, pot: 1000, legalActions: [
      { kind: "check" }, { kind: "bet", minAmount: 100, maxAmount: 44_700 }, { kind: "all_in", amount: 44_700 }] });
    expect(labels()).toEqual(["1/3333", "1/2500", "2/3667", "Pot1,000"]);
    expect(play().textContent).toBe("BET 5001/2 pot · Enter");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith("bet", 500);
  });

  it("raises with real pot-size maths: call first, then raise by the pot", () => {
    // a 300 bet into 1,000: the pot is 1,300; calling makes 1,600; pot raise is to 300 + 1,600
    expect(presets({ ...flop, toCall: 300, pot: 1300, min: 600 }).map((p) => p.amount)).toEqual([833, 1100, 1367, 1900]);
  });

  it("keeps every size inside the legal minimum and maximum", () => {
    expect(presets({ ...flop, pot: 150 }).map((p) => p.amount)).toEqual([100, 100, 100, 150]);
    expect(presets({ ...flop, pot: 90_000 })[3].amount).toBe(44_700);
  });
});

describe("controls", () => {
  it("plays a size picked by tap when Enter follows, though the tapped button keeps focus", () => {
    const onAction = table({});
    const threeX = screen.getByTestId("size-3x");
    fireEvent.click(threeX);
    threeX.focus();
    fireEvent.keyDown(threeX, { key: "Enter" });
    expect(onAction).toHaveBeenCalledWith("raise", 300);
  });

  it("plays the whole stack as an all-in when the size reaches it", () => {
    const onAction = table({});
    fireEvent.click(screen.getByTestId("size-allin"));
    expect(play().textContent).toContain("ALL-IN 45,450");
    fireEvent.click(play());
    expect(onAction).toHaveBeenCalledWith("all_in", 45_450);
  });

  it("answers F, C, K and the arrow keys, and ignores letters typed into the amount", () => {
    const onAction = table({});
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByTestId("bet-amount"), { key: "f" });
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAction).toHaveBeenLastCalledWith("raise", 350);
    fireEvent.keyDown(window, { key: "c" });
    expect(onAction).toHaveBeenLastCalledWith("call", 100);
    fireEvent.keyDown(window, { key: "f" });
    expect(onAction).toHaveBeenLastCalledWith("fold");
  });

  it("does nothing on keys when it is not the hero's turn", () => {
    const waiting = table({ disabled: true });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(waiting).not.toHaveBeenCalled();
  });

  it("F does not fold when checking is free; K checks", () => {
    const onAction = table({ street: "flop", toCall: 0, pot: 600, legalActions: [
      { kind: "check" }, { kind: "bet", minAmount: 100, maxAmount: 5000 }, { kind: "all_in", amount: 5000 }] });
    fireEvent.keyDown(window, { key: "f" });
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "k" });
    expect(onAction).toHaveBeenCalledWith("check", undefined);
  });
});
