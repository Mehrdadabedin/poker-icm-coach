/* The table and the coach panel in Simplified Chinese (plan 113; the owner,
 * 6 Nov: Chinese after Persian): buttons, seats, results, the coach's rows,
 * values and sentences, the bots' reasons, hand names and screen-reader names. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { HeroControls } from "../src/components/HeroControls";
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
import { zh } from "../src/i18n/messages/zh";
import { handName } from "../src/i18n/review";
import { translate, type Params } from "../src/i18n/translate";

const AREAS = { table, tableStrip, coach, a11y, speak, review, hands };
// the same in Chinese: abbreviations the term sheet keeps in Latin, and the card ranks a screen reader says as digits
const SAME = new Set<string>(["size.bb", "coach.row.SPR", "coach.row.ICM EV", "a11y.rank.T",
  ...["9", "8", "7", "6", "5", "4", "3", "2"].map((r) => `a11y.rank.${r}`)]);
const tZh = (key: MessageKey, params?: Params) => translate("zh", key, params);

/** The codes of a "code": "text" dict in a backend file. */
function serverCodes(file: string, from: string, to?: string): string[] {
  const text = readFileSync(file, "utf8");
  const start = text.indexOf(from);
  const body = text.slice(start, to ? text.indexOf(to, start) : text.indexOf("\n}", start));
  return [...body.matchAll(/"(\w+)":\s*(?:"[^"]*"\s*)+,/g)].map(([, code]) => code);
}

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the table in Chinese", () => {
  it("translates every key of the table, coach, review, hand and screen-reader areas", () => {
    for (const [area, keys] of Object.entries(AREAS)) {
      const left = (Object.keys(keys) as MessageKey[]).filter((k) => en[k].trim() && !SAME.has(k) && zh[k] === en[k]);
      expect(left, area).toEqual([]);
    }
  });

  it("has a Chinese sentence for every coach reason and bot reason the server sends", () => {
    const reasons = serverCodes("../backend/app/strategy/reasons.py", "TEXT: dict", "FIRST_SENTENCE =");
    expect(reasons.length).toBeGreaterThanOrEqual(26);
    for (const code of reasons) expect(zh[`coach.reason.${code}` as MessageKey], code).not.toBe(en[`coach.reason.${code}` as MessageKey]);
    const bots = serverCodes("../backend/app/services/bot_texts.py", "DECISION: dict");
    expect(bots.length).toBeGreaterThanOrEqual(6);
    for (const code of bots) expect(zh[`bots.reason.${code}` as MessageKey], code).not.toBe(en[`bots.reason.${code}` as MessageKey]);
  });

  it("shows the action buttons in Chinese poker words", () => {
    render(<I18nProvider initial="zh"><HeroControls legalActions={[{ kind: "fold" }, { kind: "call" },
      { kind: "raise", minAmount: 200, maxAmount: 45_450 }, { kind: "all_in", amount: 45_450 }]} toCall={100} pot={150}
      stack={45_450} bigBlind={100} disabled={false} street="preflop" heroBet={0} actionLog={[]} onAction={() => undefined} /></I18nProvider>);
    const row = document.querySelector(".hero-controls")?.textContent ?? "";
    for (const word of ["弃牌", "跟注 100", "加注到 250", "全下 45,450"]) expect(row).toContain(word);
    expect(row).not.toMatch(/FOLD|CALL|RAISE|ALL-IN/);
  });

  it("shows the coach panel all in Chinese", () => {
    setCurrentLang("zh");
    render(<I18nProvider initial="zh"><CoachPanelView testId="coach-panel" coach={{
      recommendedAction: "RAISE", street: "preflop", reasoning: "x", reasonCode: "open_in_steal", reasonParams: { hand: "JJ", pos: "BTN" },
      detail: { ACTION: "RAISE", POSITION: "BTN", STACK: "53,550 chips (267.8 BB)", "ICM PRESSURE": "MEDIUM", BUBBLE: "EARLY",
        "STACK BAND": "BIG STACK", COVERAGE: "YOU COVER VILLAIN", ALTERNATIVE: "CHECK", "BOARD TEXTURE": "n/a" } }} /></I18nProvider>);
    const panel = screen.getByTestId("coach-panel").textContent ?? "";
    for (const text of ["ICM 教练", "加注", "翻牌前", "JJ 在 BTN 的开池范围内。后位偷盲的好机会。", "53,550 筹码（267.8 BB）",
      "ICM 压力中等", "阶段前期", "大筹码", "你的筹码多于对手", "备选过牌", "公共牌面无"]) {
      expect(panel, text).toContain(text);
    }
    expect(panel).not.toMatch(/RAISE|MEDIUM|EARLY|BIG STACK|COVER|CHECK|chips|n\/a|preflop/);
  });

  it("names the hands in Chinese, ranks in Latin", () => {
    expect(handName("Pair of Js", tZh)).toBe("一对 J");
    expect(handName("Full House, Ks full of 2s", tZh)).toBe("葫芦，三条 K 带一对 2");
    expect(handName("Two Pair, Ts & 9s", tZh)).toBe("两对，10 和 9");
  });
});
