/* Names a screen reader says for cards, seats and the board (plan 111). */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PlayingCard } from "../src/components/PlayingCard";
import { MemoryRouter } from "react-router-dom";
import { TablePage } from "../src/pages/TablePage";
import { PokerTable } from "../src/components/PokerTable";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { seatLabel } from "../src/models/seatLabel";
import { translate } from "../src/i18n/translate";
import { sampleTableState } from "../src/sampleState";

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate("en", key, params);
const table = (lang: Lang, state = sampleTableState()) =>
  render(<I18nProvider initial={lang}><PokerTable state={state} /></I18nProvider>);

describe("cards", () => {
  it.each([
    ["en", "Ace of Spades", "King of Hearts", "9 of Clubs", "Jack of Diamonds"],
    ["es", "As de picas", "Rey de corazones", "9 de tréboles", "Jota de diamantes"],
  ] as const)("are named in %s", (lang, ace, king, nine, jack) => {
    table(lang);
    for (const name of [ace, king, nine, jack]) expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it("a face-down card on its own is named, in both languages", () => {
    const { unmount } = render(<I18nProvider initial="en"><PlayingCard faceDown /></I18nProvider>);
    expect(screen.getByRole("img", { name: "Face-down card" })).toBeInTheDocument();
    unmount();
    render(<I18nProvider initial="es"><PlayingCard faceDown /></I18nProvider>);
    expect(screen.getByRole("img", { name: "Carta boca abajo" })).toBeInTheDocument();
  });
});

describe("seats", () => {
  it("are groups named with who, where, chips and what is happening", () => {
    table("en");
    expect(screen.getByRole("group", { name: "Bot 2, middle position, 45,000 chips, 450 big blinds, to act, 2 cards" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^You, under the gun, 32,100 chips, 321 big blinds, 2 cards$/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Bot 8, big blind, .*, dealer, 2 cards$/ })).toBeInTheDocument();
  });

  it("are named in Spanish with ?lang=es", () => {
    table("es");
    expect(screen.getByRole("group", { name: "Bot 2, posición media, 45.000 fichas, 450 ciegas grandes, le toca actuar, 2 cartas" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Tú, / })).toBeInTheDocument();
  });

  it("say folded, all-in, out, the bet and the last action", () => {
    render(<I18nProvider initial="en"><span /></I18nProvider>); // numbers follow the page language
    const base = sampleTableState().players[1];
    expect(seatLabel({ ...base, folded: true }, false, undefined, t)).toMatch(/, folded$/);
    expect(seatLabel({ ...base, stack: 0, bet: 900 }, false, "ALL-IN", t)).toMatch(/all-in, bet 900, last action all-in, 2 cards$/);
    expect(seatLabel({ ...base, sitsOut: true }, false, undefined, t)).toBe("Bot 1, under the gun plus one, out");
    expect(seatLabel({ ...base, bet: 2400 }, false, "RAISE", t)).toContain("bet 2,400, last action raise");
  });

  it("hide what the name already says, and give 8 bots no card-back image of their own", () => {
    const state = sampleTableState();
    state.players = state.players.map((p) => (p.isHero ? p : { ...p, profile: "tag" }));
    const { container } = table("en", state);
    expect(screen.queryAllByRole("img", { name: "Face-down card" })).toHaveLength(0);
    const backs = container.querySelectorAll('[data-testid="card-back"]');
    expect(backs.length).toBeGreaterThan(0);
    backs.forEach((back) => expect(back).toHaveAttribute("aria-hidden", "true"));
    const seat = within(screen.getByTestId("seat-8"));
    expect(seat.queryByText("BB")).toBeNull();
    for (const part of container.querySelectorAll(".seat-position, .dealer-button, .seat-bb")) {
      expect(part).toHaveAttribute("aria-hidden", "true");
    }
    const photos = container.querySelectorAll(".seat-bot-portrait");
    expect(photos).toHaveLength(8);
    photos.forEach((img) => expect(img).toHaveAttribute("alt", ""));
  });
});

describe("the board", () => {
  it("is a named group, in both languages", () => {
    const { unmount } = table("en");
    expect(within(screen.getByRole("group", { name: "Board" })).getByRole("img", { name: "9 of Clubs" })).toBeInTheDocument();
    unmount();
    table("es");
    expect(screen.getByRole("group", { name: "Mesa" })).toBeInTheDocument();
  });

  it("says there are no cards yet when it is empty", () => {
    const state = { ...sampleTableState(), communityCards: [] };
    table("en", state);
    expect(within(screen.getByRole("group", { name: "Board" })).getByText("No cards yet")).toBeInTheDocument();
  });
});

describe("names on the table", () => {
  it("never sit on a plain div or span without a role", () => {
    const { container } = table("en");
    const bad = Array.from(container.querySelectorAll("div[aria-label], span[aria-label]")).filter((el) => !el.getAttribute("role"));
    expect(bad.map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  });
});

describe("the table page", () => {
  it("has a heading that says ICMBOT", () => {
    localStorage.clear();
    render(<MemoryRouter initialEntries={["/table/x"]}><TablePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "ICMBOT" })).toBeInTheDocument();
  });
});
