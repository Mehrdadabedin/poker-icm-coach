/* Names a screen reader says for the action row, the bet sizer, HIDE and SHOW
 * and the ✕ that removes a card (plan 111, PR 3). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { CardPicker } from "../src/components/CoachCardPicker";
import { HandReview } from "../src/components/HandReview";
import { HeroControls } from "../src/components/HeroControls";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import type { LegalAction } from "../src/models/game";
import { CoachPage } from "../src/pages/CoachPage";
import { sampleReview } from "../src/sampleState";
import { advice } from "./strip_helpers";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

/** The page language as a visitor sets it, with ?lang=es in the address. */
function page(lang: "en" | "es", ui: ReactNode) {
  window.history.replaceState(null, "", lang === "es" ? "/?lang=es" : "/");
  return render(<I18nProvider><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);
}

beforeEach(() => { request.mockResolvedValue({ hands: [] }); });
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  setCurrentLang("en");
  vi.clearAllMocks();
});

const RAISE: LegalAction[] = [
  { kind: "fold" }, { kind: "call" }, { kind: "raise", minAmount: 200, maxAmount: 45_450 }, { kind: "all_in", amount: 45_450 }];
const controls = (lang: "en" | "es", disabled = false, onAction = vi.fn()) => page(lang,
  <HeroControls legalActions={RAISE} toCall={1200} pot={1500} stack={45_450} bigBlind={100}
    disabled={disabled} street="preflop" heroBet={0} actionLog={[]} onAction={onAction} />);

const keys = (name: RegExp) => screen.getByRole("button", { name }).getAttribute("aria-keyshortcuts");

describe("the action row", () => {
  it.each([
    ["en", "Your actions", "Your actions, waiting", ["Fold", "Call 1,200", "RAISE TO 250, 2.5 BB", "All-in 45,450"]],
    ["es", "Tus acciones", "Tus acciones, esperando", ["No ir", "Igualar 1200", "SUBIR A 250, 2,5 BB", "All-in 45.450"]],
  ] as const)("is a group named in %s, with waiting when it is not the hero's turn", (lang, name, waiting, buttons) => {
    const { unmount } = controls(lang);
    const row = screen.getByRole("group", { name });
    for (const button of buttons) expect(within(row).getByRole("button", { name: button })).toBeInTheDocument();
    unmount();
    controls(lang, true);
    expect(screen.getByRole("group", { name: waiting })).toBeInTheDocument();
  });

  it("names every button with the words it shows", () => {
    controls("en");
    for (const button of within(screen.getByRole("group", { name: "Your actions" })).getAllByRole("button")) {
      const name = (button.getAttribute("aria-label") ?? "").toLowerCase();
      const shown = [...button.querySelectorAll("*"), button].filter((el) => !el.closest(".key-hint"))
        .flatMap((el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent?.trim() ?? ""));
      for (const words of shown.filter(Boolean)) expect(name, `"${words}" is shown but not in "${name}"`).toContain(words.toLowerCase());
    }
  });

  it("tells the keys in aria-keyshortcuts, and those keys play", async () => {
    const onAction = vi.fn();
    controls("en", false, onAction);
    expect([keys(/^Fold$/), keys(/^Call/), keys(/^RAISE TO/), keys(/^Smaller$/), keys(/^Bigger$/)])
      .toEqual(["F", "C", "Enter", "ArrowLeft", "ArrowRight"]);
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect(onAction).toHaveBeenLastCalledWith("raise", 350);
    await userEvent.keyboard("C");
    expect(onAction).toHaveBeenLastCalledWith("call", 1200);
    await userEvent.keyboard("F");
    expect(onAction).toHaveBeenLastCalledWith("fold");
  });
});

describe("the bet sizer", () => {
  it("names the presets with their chips and reads the slider in chips and big blinds", () => {
    controls("en");
    expect(screen.getByRole("button", { name: "2.5x, 250 chips" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All-in, 45,450 chips" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Bet size" });
    expect(slider).toHaveAttribute("aria-valuetext", "250 chips, 2.5 big blinds");
    fireEvent.click(screen.getByRole("button", { name: "Bigger" }));
    expect(slider).toHaveAttribute("aria-valuetext", "350 chips, 3.5 big blinds");
  });

  it("says the same in Spanish", () => {
    controls("es");
    expect(screen.getByRole("button", { name: "2,5x, 250 fichas" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Tamaño de la apuesta" }))
      .toHaveAttribute("aria-valuetext", "250 fichas, 2,5 ciegas grandes");
  });
});

describe("HIDE and SHOW", () => {
  it("say whether the coach panel is open", () => {
    const { rerender } = page("en", <CoachPanelView coach={advice} testId="p" onToggle={() => undefined} />);
    expect(screen.getByRole("button", { name: "HIDE ▲" })).toHaveAttribute("aria-expanded", "true");
    rerender(<I18nProvider><MemoryRouter><CoachPanelView coach={advice} testId="p" collapsed onToggle={() => undefined} /></MemoryRouter></I18nProvider>);
    expect(screen.getByRole("button", { name: "SHOW ▼" })).toHaveAttribute("aria-expanded", "false");
  });

  it("say whether the coaching in the hand review is open, in Spanish too", () => {
    page("es", <HandReview review={sampleReview()} coach={advice} comparison={null} totalPlayers={9}
      nameBySeat={new Map()} onBack={() => undefined} />);
    const toggle = screen.getByRole("button", { expanded: true, name: "OCULTAR CONSEJOS DEL COACH" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("the ✕ that removes a card", () => {
  it.each([["en", "Remove 2 of Clubs"], ["es", "Quitar 2 de tréboles"]] as const)("on the Coach board is named in %s", (lang, name) => {
    page(lang, <CoachPage />);
    fireEvent.change(screen.getByTestId("add-card-rank"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("add-card-suit"), { target: { value: "c" } });
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it.each([["en", "Remove Ace of Spades"], ["es", "Quitar As de picas"]] as const)("in the card picker is named in %s", (lang, name) => {
    page(lang, <CardPicker label="Card 1" id="card-1" value={{ rank: "A", suit: "s" }} used={[]} onChange={() => undefined} />);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });
});
