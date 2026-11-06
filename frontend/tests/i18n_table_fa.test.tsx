/* The table and the coach panel in Persian (plan 113; the owner, 6 Nov: no
 * English left on the table): buttons, seats, results, the coach's rows,
 * values and sentences, the bots' reasons, hand names and screen-reader names. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { HeroControls } from "../src/components/HeroControls";
import { PokerTable } from "../src/components/PokerTable";
import { factorRow } from "../src/i18n/coach";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { en, type MessageKey } from "../src/i18n/messages/en";
import { a11y } from "../src/i18n/messages/en/a11y";
import { coach } from "../src/i18n/messages/en/coach";
import { hands } from "../src/i18n/messages/en/hands";
import { review } from "../src/i18n/messages/en/review";
import { speak } from "../src/i18n/messages/en/speak";
import { table } from "../src/i18n/messages/en/table";
import { tableStrip } from "../src/i18n/messages/en/tableStrip";
import { fa } from "../src/i18n/messages/fa";
import { handName } from "../src/i18n/review";
import { sampleTableState } from "../src/sampleState";
import { translate, type Params } from "../src/i18n/translate";

const AREAS = { table, tableStrip, coach, a11y, speak, review, hands };
// the same in Persian: abbreviations the term sheet keeps in Latin
const SAME = new Set<MessageKey>(["size.bb", "coach.row.SPR"]);
const tFa = (key: MessageKey, params?: Params) => translate("fa", key, params);
const plain = (text: string | null) => (text ?? "").replace(/[\u2068\u2069]/g, "");

/** "code": "text" pairs from a dict in a backend file. */
function serverCodes(file: string, from: string, to?: string): string[] {
  const text = readFileSync(file, "utf8");
  const start = text.indexOf(from);
  const body = text.slice(start, to ? text.indexOf(to, start) : text.indexOf("\n}", start));
  return [...body.matchAll(/"(\w+)":\s*(?:"[^"]*"\s*)+,/g)].map(([, code]) => code);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setCurrentLang("en");
});

describe("the table in Persian", () => {
  it("translates every key of the table, coach, review, hand and screen-reader areas", () => {
    for (const [area, keys] of Object.entries(AREAS)) {
      const left = (Object.keys(keys) as MessageKey[]).filter((k) => en[k].trim() && !SAME.has(k) && fa[k] === en[k]);
      expect(left, area).toEqual([]);
    }
  });

  it("has a Persian sentence for every coach reason and bot reason the server sends", () => {
    const reasons = serverCodes("../backend/app/strategy/reasons.py", "TEXT: dict", "FIRST_SENTENCE =");
    expect(reasons.length).toBeGreaterThanOrEqual(26);
    for (const code of reasons) expect(fa[`coach.reason.${code}` as MessageKey], code).not.toBe(en[`coach.reason.${code}` as MessageKey]);
    const bots = serverCodes("../backend/app/services/bot_texts.py", "DECISION: dict");
    expect(bots.length).toBeGreaterThanOrEqual(6);
    for (const code of bots) expect(fa[`bots.reason.${code}` as MessageKey], code).not.toBe(en[`bots.reason.${code}` as MessageKey]);
  });

  it("shows the action buttons in Persian poker words", () => {
    render(<I18nProvider initial="fa"><HeroControls legalActions={[{ kind: "fold" }, { kind: "call" },
      { kind: "raise", minAmount: 200, maxAmount: 45_450 }, { kind: "all_in", amount: 45_450 }]} toCall={100} pot={150}
      stack={45_450} bigBlind={100} disabled={false} street="preflop" heroBet={0} actionLog={[]} onAction={() => undefined} /></I18nProvider>);
    const row = plain(document.querySelector(".hero-controls")?.textContent ?? "");
    for (const word of ["فولد", "کال ۱۰۰", "ریز تا ۲۵۰", "آل‌این ۴۵٬۴۵۰"]) expect(row).toContain(word);
    expect(row).not.toMatch(/FOLD|CALL|RAISE|ALL-IN/);
  });

  it("shows the coach panel the owner saw, all in Persian", () => {
    setCurrentLang("fa");
    const advice = { reasoning: "x", reasonCode: "open_in_steal", reasonParams: { hand: "JJ", pos: "BTN" } };
    render(<I18nProvider initial="fa"><CoachPanelView testId="coach-panel" coach={{
      recommendedAction: "RAISE", street: "preflop", ...advice,
      detail: { ACTION: "RAISE", POSITION: "BTN", STACK: "53,550 chips (267.8 BB)", "ICM PRESSURE": "MEDIUM", BUBBLE: "EARLY",
        "STACK BAND": "BIG STACK", COVERAGE: "YOU COVER VILLAIN", ALTERNATIVE: "CHECK", "BOARD TEXTURE": "n/a" } }} /></I18nProvider>);
    const panel = plain(screen.getByTestId("coach-panel").textContent);
    for (const text of ["مربی ICM", "ریز", "JJ در رنج اوپن BTN است. موقعیت مناسبی برای استیل از پوزیشن آخر.", "پوزیشن",
      "۵۳٬۵۵۰ چیپ (۲۶۷٫۸ BB)", "فشار ICMمتوسط", "مرحلهاوایل", "استک بزرگ", "استک تو بیشتر از حریف است", "جایگزینچک", "ندارد"]) {
      expect(panel, text).toContain(text);
    }
    expect(panel).not.toMatch(/RAISE|MEDIUM|EARLY|BIG STACK|COVER|CHECK|chips|n\/a|preflop/);
    expect(factorRow("BOARD TEXTURE", "DRY", advice, tFa)).toEqual(["بافت بورد", "خشک"]);
  });

  it("names the hands in Persian, ranks in Latin", () => {
    expect(plain(handName("Pair of Js", tFa))).toBe("جفت J");
    expect(plain(handName("Two Pair, Ts & 9s", tFa))).toBe("دو جفت، 10 و 9");
    expect(handName("Uncontested (all others folded)", tFa)).toBe("بدون رقیب (بقیه فولد کردند)");
  });

  it("writes every number on the table in Persian digits, and only under Persian", () => {
    expect(plain(translate("fa", "status.level", { level: 2 }))).toBe("سطح ۲");
    expect(translate("en", "status.level", { level: 2 })).toBe("LEVEL 2");
    expect(translate("es", "status.hand", { n: 12 })).toBe("MANO #12");
    render(<I18nProvider initial="fa"><PokerTable state={sampleTableState()} /></I18nProvider>);
    const header = plain(document.querySelector(".table-header")?.textContent ?? "");
    const seats = [...document.querySelectorAll(".seat-bb")].map((n) => n.textContent ?? "");
    expect(header).not.toMatch(/[0-9]/);
    expect(seats.length).toBe(9);
    for (const bb of seats) expect(bb).toMatch(/^[۰-۹٫]+ BB$/);
  });
});
