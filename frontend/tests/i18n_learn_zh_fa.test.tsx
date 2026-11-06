/* Learn and review in Simplified Chinese and Persian (plan 113 steps 6 and
 * 7): My mistakes, hand history, the Report, the glossary, the quiz, the coach
 * page, settings, the ICM calculator and the leaderboard. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { en, type MessageKey } from "../src/i18n/messages/en";
import { glossary } from "../src/i18n/messages/en/glossary";
import { glossaryTerms } from "../src/i18n/messages/en/glossaryTerms";
import { handHistory } from "../src/i18n/messages/en/handHistory";
import { leaderboard } from "../src/i18n/messages/en/leaderboard";
import { mistakes } from "../src/i18n/messages/en/mistakes";
import { practice } from "../src/i18n/messages/en/practice";
import { quiz } from "../src/i18n/messages/en/quiz";
import { report } from "../src/i18n/messages/en/report";
import { tools } from "../src/i18n/messages/en/tools";
import { leakText, sizingInsight } from "../src/models/report";
import { GlossaryPage } from "../src/pages/GlossaryPage";
import { MESSAGES, translate, type Params } from "../src/i18n/translate";

const AREAS = { mistakes, handHistory, report, glossary, glossaryTerms, quiz, practice, tools, leaderboard };
// the same in every language: dots between two numbers, and names kept Latin
const SAME = new Set<string>(["leaderboard.stats", "icm.col.icm", "gl.icmEv.name"]);
// hand codes, cards and positions stay Latin (TERMS_zh_fa.md)
const LATIN_CODES = /UTG\+1|[2-9TJQKA][♠♥♦♣]|\b[2-9TJQKA]{2}[so]?\b/g;

const t = (lang: "zh" | "fa" | "en") => (key: MessageKey, params?: Params) => translate(lang, key, params);

afterEach(cleanup);

describe("Learn and review in Chinese and Persian", () => {
  it.each(["zh", "fa"] as const)("translates every key of the nine areas in %s", (lang) => {
    for (const [area, keys] of Object.entries(AREAS)) {
      const left = (Object.keys(keys) as MessageKey[]).filter((k) => en[k].trim() && !SAME.has(k) && MESSAGES[lang][k] === en[k]);
      expect(left, `${lang} ${area}`).toEqual([]);
    }
  });

  it("writes Persian digits in Persian text, apart from hand codes, cards and positions", () => {
    const latin = Object.values(AREAS).flatMap((keys) => Object.keys(keys) as MessageKey[])
      .filter((k) => /[0-9]/.test(MESSAGES.fa[k].replace(/\{\w+\}/g, "").replace(LATIN_CODES, "")));
    expect(latin).toEqual([]);
  });

  it("names the street in the Report's sentences in the language", () => {
    const sizes = { street: "flop" as const, bets: 10, buckets: [{ size: "under25" as const, count: 6 }, { size: "half" as const, count: 4 }] };
    expect(sizingInsight(sizes, t("zh"))).toBe("你在翻牌圈的下注大多不到四分之一底池。下注太小会让对手便宜跟注；通常 1/3 到 2/3 底池效果更好。");
    expect(sizingInsight(sizes, t("fa"))).toContain("بیشتر بت‌های تو در ⁨فلاپ⁩ کمتر از یک‌چهارم پات است.");
    expect(sizingInsight(sizes, t("en"))).toContain("Most of your flop bets are under a quarter of the pot.");
    const leak = { position: "BB", street: "preflop", heroAction: "CALL", coachAction: "FOLD", count: 3, hands: [] };
    // the action words come from the coach area: Persian is on main, Chinese comes with #149
    expect(leakText(leak, t("fa")).replace(/[\u2068\u2069]/g, "")).toBe("BB، پری‌فلاپ: کال وقتی مربی می‌گوید فولد");
    expect(leakText(leak, t("en"))).toBe("BB, preflop: CALL where the coach says FOLD");
  });

  it.each([
    ["fa", "واژه‌نامه", "تعادل پوش/فولد", "اکوییتی"],
    ["zh", "术语表", "推弃均衡", "胜率"],
  ] as const)("shows and searches the glossary in %s", (lang, title, pushFold, search) => {
    render(<I18nProvider initial={lang}><MemoryRouter><GlossaryPage /></MemoryRouter></I18nProvider>);
    expect(screen.getByTestId("glossary-page")).toHaveTextContent(title);
    expect(screen.getByTestId("glossary-entry-pushFold")).toHaveTextContent(pushFold);
    fireEvent.change(screen.getByTestId("glossary-search"), { target: { value: search } });
    expect(screen.getByTestId("glossary-entry-equity")).toBeInTheDocument();
  });
});
