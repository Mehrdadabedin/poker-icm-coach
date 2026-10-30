/* The landing hero's two pictures take turns every 5 seconds (the owner, 30 Oct). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { HERO_ROTATE_MS, HeroPictures } from "../src/landing-minimal/HeroPictures";

const onTop = () => document.querySelector(".lm-hero-pictures img.is-on");
const app = () => screen.getByTestId("minimal-hero-visual");
const glow = () => screen.getByTestId("minimal-hero-glow");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the hero pictures", () => {
  it("starts on the real app, with the other picture hidden from screen readers", () => {
    render(<HeroPictures />);
    expect(onTop()).toBe(app());
    expect(app()).toHaveAttribute("aria-hidden", "false");
    expect(glow()).toHaveAttribute("aria-hidden", "true");
    expect(glow()).toHaveAttribute("src", "/images/hero-glow.webp");
  });

  it("changes every 5 seconds and comes back", () => {
    render(<HeroPictures />);
    expect(HERO_ROTATE_MS).toBe(5000);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(onTop()).toBe(app());
    act(() => { vi.advanceTimersByTime(1); });
    expect(onTop()).toBe(glow());
    expect(glow()).toHaveAttribute("aria-hidden", "false");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onTop()).toBe(app());
  });

  it("stays on the first picture with reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") }));
    render(<HeroPictures />);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(onTop()).toBe(app());
  });

  it("stops the timer when the page closes", () => {
    const { unmount } = render(<HeroPictures />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
