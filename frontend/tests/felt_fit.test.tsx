/* On a phone held upright no seat may sit behind the bet controls (the owner,
 * 29 Oct): the felt shrinks to fit, down to 60%, and is left alone elsewhere.
 * jsdom has no layout, so the page's overflow and the felt's height are stubbed. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { MIN_FELT_ZOOM, fitFelt, useFeltFit } from "../src/hooks/useFeltFit";

/** A page that overflows by `over` px at zoom 1, shrinking in step with the felt. */
function stubPage(felt: HTMLElement, feltHeight: number, over: number) {
  const zoom = () => Number(felt.style.zoom || 1);
  Object.defineProperty(window, "innerHeight", { value: 780, configurable: true });
  Object.defineProperty(document, "scrollingElement", {
    configurable: true,
    value: { get scrollHeight() { return 780 + over - feltHeight * (1 - zoom()); } },
  });
  felt.getBoundingClientRect = () => ({ height: feltHeight * zoom() } as DOMRect);
}

afterEach(cleanup);

describe("fitting the felt", () => {
  it("leaves the felt at full size when the page fits", () => {
    const felt = document.createElement("div");
    stubPage(felt, 500, 0);
    expect(fitFelt(felt)).toBe(1);
    expect(felt.style.zoom).toBe("");
  });

  it("shrinks it just enough for the bet controls to stay clear", () => {
    const felt = document.createElement("div");
    stubPage(felt, 500, 80);
    const zoom = fitFelt(felt);
    expect(zoom).toBeCloseTo(0.84, 2);
    expect(document.scrollingElement!.scrollHeight - window.innerHeight).toBeLessThanOrEqual(0.5);
  });

  it("never below 60%, where the page may scroll instead", () => {
    const felt = document.createElement("div");
    stubPage(felt, 400, 300);
    expect(fitFelt(felt)).toBe(MIN_FELT_ZOOM);
    expect(felt.style.zoom).toBe(String(MIN_FELT_ZOOM));
  });

  it("grows back to full size when there is room again", () => {
    const felt = document.createElement("div");
    stubPage(felt, 500, 80);
    fitFelt(felt);
    stubPage(felt, 500, 0);
    expect(fitFelt(felt)).toBe(1);
  });
});

function Felt({ on, layout }: { on: boolean; layout: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFeltFit(ref, on, layout);
  return <div ref={ref} data-testid="felt" style={{ zoom: 0.7 }} />;
}

describe("the hook", () => {
  it("clears any zoom when the phone is not upright", () => {
    const { getByTestId } = render(<Felt on={false} layout="a" />);
    expect(getByTestId("felt").style.zoom).toBe("");
  });
});
