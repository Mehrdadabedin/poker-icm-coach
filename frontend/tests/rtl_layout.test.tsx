/* Persian reads right to left, the poker stays left to right (plan 113 step
 * 2): the felt, the cards, the hand's actions, the charts and the sign-in
 * fields keep dir="ltr"; values in a Persian sentence are isolated; the
 * "before → after" arrow turns round. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ActionHistory } from "../src/components/ActionHistory";
import { LoginForm } from "../src/components/LoginForm";
import { PokerTable } from "../src/components/PokerTable";
import { I18nProvider } from "../src/i18n/I18n";
import { forwardArrow, type Lang } from "../src/i18n/lang";
import { translate } from "../src/i18n/translate";
import type { ReviewAction } from "../src/models/game";
import { sampleTableState } from "../src/sampleState";

afterEach(cleanup);

const table = (lang: Lang) => render(<I18nProvider initial={lang}><PokerTable state={sampleTableState()} /></I18nProvider>);
const seatOrder = () => [...document.querySelectorAll(".table-felt .seat-name")].map((n) => n.textContent);

const ACTIONS: ReviewAction[] = [
  { seat: 1, name: "Bot Ana", action: "small_blind", amount: 50, street: "preflop" },
  { seat: 0, name: "mehrdad", action: "raise", amount: 250, street: "preflop" },
  { seat: 1, name: "Bot Ana", action: "fold", amount: null, street: "preflop" },
];

describe("what stays left to right under Persian", () => {
  it("keeps the felt left to right, with the seats in the same order as in English", () => {
    table("en");
    const english = seatOrder();
    cleanup();
    table("fa");
    expect(document.querySelector(".table-felt")).toHaveAttribute("dir", "ltr");
    expect(seatOrder()).toEqual(english);
    expect(english).toHaveLength(9);
  });

  it("keeps the hand's actions in order, left to right, and isolates each name", () => {
    render(<I18nProvider initial="fa"><ActionHistory actions={ACTIONS} heroSeat={0} nameBySeat={new Map([[0, "mehrdad"]])} /></I18nProvider>);
    expect(document.querySelector(".history-street")).toHaveAttribute("dir", "ltr");
    expect(document.querySelector(".history-blind")).toHaveAttribute("dir", "ltr");
    expect([...document.querySelectorAll(".history-line bdi")].map((b) => b.textContent)).toEqual(["Bot Ana", "mehrdad", "Bot Ana"]);
  });

  it("keeps the username and password left to right", () => {
    render(<I18nProvider initial="fa"><MemoryRouter><LoginForm onLogin={() => undefined} /></MemoryRouter></I18nProvider>);
    expect(screen.getByTestId("username-input")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("password-input")).toHaveAttribute("dir", "ltr");
  });
});

describe("text in a right-to-left language", () => {
  it("isolates each value in Persian only", () => {
    expect(translate("fa", "mistake.stack", { bb: "۱۲" })).toBe("استک \u2068۱۲\u2069 BB");
    expect(translate("en", "mistake.stack", { bb: "12" })).toBe("Stack 12 BB");
    expect(translate("zh", "mistake.stack", { bb: "12" })).toBe("筹码 12 BB");
  });

  it("turns the before and after arrow round", () => {
    expect(forwardArrow("fa")).toBe("←");
    expect(["en", "es", "zh"].map((l) => forwardArrow(l as Lang))).toEqual(["→", "→", "→"]);
  });
});
