/* The coach's voice at the table (plan 112): once per decision, off by default, stopped when it should be. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { TableState } from "../src/models/game";
import { sampleTableState } from "../src/sampleState";
import { type FakeSpeech, installFakeSpeech } from "./speech_fake";
import { advice, setUpright, view } from "./strip_helpers";

const { plan } = vi.hoisted(() => ({ plan: { free: false } }));
vi.mock("../src/services/plan", () => ({
  usePlan: () => ({ pro: !plan.free, admin: false, known: true, loading: false }),
  useIsFree: () => plan.free,
}));

let speech: FakeSpeech;
const KEY = "icmbot.coachVoice";
const RAISE_LOG = [{ seat: 3, action: "raise", amount: 300, street: "preflop" }];
const turn = (patch: Partial<TableState> = {}): TableState => ({
  ...sampleTableState(), waitingForHero: true, street: "preflop", communityCards: [], actionLog: RAISE_LOG, toCall: 300, ...patch,
});
const FLOP_CARDS = [{ rank: "9", suit: "c" }, { rank: "5", suit: "s" }, { rank: "2", suit: "d" }] as const;
const texts = () => speech.spoken.map((s) => s.text);
const chip = () => screen.getByRole("button", { name: /Coach voice|Voz del coach/ });
/** the table at the hero's turn; `next` shows another snapshot of it */
const table = (patch: Partial<TableState> = {}, lang?: "en" | "es") => {
  const out = view(turn(patch), {}, lang);
  return { ...out, next: (state: TableState, coach: typeof advice | null = advice) => out.rerenderWith({ state, coach }) };
};

beforeEach(() => {
  localStorage.clear();
  setUpright(false);
  plan.free = false;
  speech = installFakeSpeech();
});
afterEach(() => speech.remove());

describe("off by default", () => {
  it("says nothing and shows the chip unpressed", () => {
    table();
    expect(texts()).toEqual([]);
    expect(chip()).toHaveAttribute("aria-pressed", "false");
  });
});

describe("once per decision", () => {
  beforeEach(() => localStorage.setItem(KEY, "1"));

  it("says the advice once for ten identical polls", () => {
    const { next } = table();
    for (let i = 0; i < 10; i += 1) next(turn(), { ...advice });
    expect(texts()).toEqual(["Raise."]);
    expect(speech.spoken[0]).toMatchObject({ lang: "en-US", rate: 1.05 });
  });

  it("says it again on a new street", () => {
    const { next } = table();
    next(turn({ street: "flop", communityCards: [...FLOP_CARDS], actionLog: [] }), { ...advice, street: "flop" });
    expect(texts()).toEqual(["Raise.", "Raise."]);
  });

  it("says it again when the betting is reopened on the same street", () => {
    const { next } = table();
    next(turn({ actionLog: [...RAISE_LOG, { seat: 4, action: "raise", amount: 900, street: "preflop" }] }));
    expect(texts()).toEqual(["Raise.", "Raise."]);
  });
});

describe("it stops", () => {
  beforeEach(() => localStorage.setItem(KEY, "1"));
  const cancelsAfter = (action: () => void) => {
    const before = speech.cancels();
    action();
    return speech.cancels() - before;
  };

  it("when the hero acts", () => {
    const { container } = table({ legalActions: [{ kind: "fold" }, { kind: "call" }] });
    expect(cancelsAfter(() => fireEvent.click(container.querySelector(".btn-call") as HTMLElement))).toBeGreaterThan(0);
  });

  it("when the turn is over", () => {
    const { next } = table();
    expect(cancelsAfter(() => next(turn({ waitingForHero: false }), null))).toBeGreaterThan(0);
  });

  it("when the page is hidden", () => {
    table();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    expect(cancelsAfter(() => document.dispatchEvent(new Event("visibilitychange")))).toBeGreaterThan(0);
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("when the chip is turned off", () => {
    table();
    expect(cancelsAfter(() => fireEvent.click(chip()))).toBeGreaterThan(0);
    expect(chip()).toHaveAttribute("aria-pressed", "false");
  });

  it("and polls with no advice do not cut off what the chip just said", () => {
    localStorage.setItem(KEY, "0");
    const { next } = table({ waitingForHero: false });
    fireEvent.click(chip());
    const before = speech.cancels();
    for (let i = 0; i < 5; i += 1) next(turn({ waitingForHero: false }), null);
    expect(speech.cancels()).toBe(before);
    expect(texts()).toEqual(["Coach voice on."]);
  });
});

describe("the chip", () => {
  it("flips aria-pressed, says it is on, and remembers the choice", () => {
    const { unmount } = table({ waitingForHero: false });
    expect(chip()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip());
    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(texts()).toEqual(["Coach voice on."]);
    expect(localStorage.getItem(KEY)).toBe("1");
    unmount();
    table({ waitingForHero: false });
    expect(chip()).toHaveAttribute("aria-pressed", "true");
  });

  it("turned on during the hero's turn, says it is on and then the advice, without cutting in", () => {
    table();
    const before = speech.cancels();
    fireEvent.click(chip());
    expect(texts()).toEqual(["Coach voice on.", "Raise."]);
    expect(speech.cancels() - before).toBe(1);
  });

  it("is in Spanish with es-ES", () => {
    table({ waitingForHero: false }, "es");
    expect(chip()).toHaveAccessibleName("Voz del coach");
    fireEvent.click(chip());
    expect(speech.spoken[0]).toMatchObject({ text: "Voz del coach activada.", lang: "es-ES" });
  });

  it("is hidden for a Free player, who hears nothing", () => {
    plan.free = true;
    localStorage.setItem(KEY, "1");
    table();
    expect(screen.queryByTestId("speaker-chip")).toBeNull();
    expect(texts()).toEqual([]);
  });

  it("is hidden when the device cannot speak", () => {
    speech.remove();
    table();
    expect(screen.queryByTestId("speaker-chip")).toBeNull();
  });

  it("after a reload with the voice on, the first touch says an empty sentence once", () => {
    localStorage.setItem(KEY, "1");
    table({ waitingForHero: false });
    expect(texts()).toEqual([]);
    fireEvent.pointerDown(document.body);
    fireEvent.pointerDown(document.body);
    expect(texts()).toEqual([""]);
  });
});

const turnText = () => screen.getByTestId("announce-assertive").textContent;

describe("the screen-reader announcer", () => {
  it("says the coach's advice when the voice is off", () => {
    const { next } = table({ waitingForHero: false });
    next(turn(), advice);
    expect(turnText()).toBe("Your turn. 300 to call. Pot 3,400. Coach: RAISE");
  });

  it("leaves the advice out while the coach voice is on, so it is not said twice", () => {
    localStorage.setItem(KEY, "1");
    const { next } = table({ waitingForHero: false });
    next(turn(), advice);
    expect(turnText()).toBe("Your turn. 300 to call. Pot 3,400.");
    expect(texts()).toEqual(["Raise."]);
  });
});
