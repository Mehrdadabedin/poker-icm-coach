/* Simplified Chinese and Persian, the plumbing (plan 113 step 1): detection,
 * the menu, <html lang> and dir, numbers, places, dates and digits typed.
 * Neither language is READY yet, so the live site is unchanged. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HeroControls } from "../src/components/HeroControls";
import { LanguageMenu } from "../src/components/LanguageMenu";
import { weekDates } from "../src/components/leaderboardDates";
import { I18nProvider, useI18n } from "../src/i18n/I18n";
import { parseDigits } from "../src/i18n/digits";
import { APP_READY, detectLang, localNumber, offeredLangs, placeOrdinal, READY, setCurrentLang, type LangSources } from "../src/i18n/lang";
import { formatChips } from "../src/models/game";
import { tournamentState } from "../src/models/history";
import { translate } from "../src/i18n/translate";

const src = (over: Partial<LangSources> = {}): LangSources =>
  ({ search: "", saved: null, host: "icmbot.one", browser: ["en-GB"], inApp: false, ...over });
const APP_UA = "Mozilla/5.0 (Linux; Android 14) ICMBOTApp";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  setCurrentLang("en");
  document.documentElement.lang = "";
  document.documentElement.dir = "";
});

describe("finding Chinese and Persian", () => {
  it("previews either with ?lang= while neither is ready", () => {
    expect(READY).toEqual(["en"]);
    expect(APP_READY).toEqual(["en", "es"]);
    expect(detectLang(src({ search: "?lang=zh" }))).toBe("zh");
    expect(detectLang(src({ search: "?lang=fa", saved: "en" }))).toBe("fa");
    expect(detectLang(src({ saved: "fa" }))).toBe("fa");
  });

  it("does not follow a Chinese or Persian browser or phone before the language is ready", () => {
    for (const tag of ["zh-CN", "zh-Hans-CN", "zh-TW", "zh-HK", "fa-IR"]) {
      expect(detectLang(src({ browser: [tag] })), tag).toBe("en");
      expect(detectLang(src({ browser: [tag], inApp: true })), `${tag} in the app`).toBe("en");
    }
  });

  it("gives every zh tag Simplified Chinese and fa-IR Persian once ready, the choice still first", () => {
    for (const tag of ["zh-CN", "zh-Hans-CN", "zh-SG", "zh-TW", "zh-HK"]) {
      expect(detectLang(src({ browser: [tag, "en"] }), ["en", "zh"]), tag).toBe("zh");
    }
    expect(detectLang(src({ browser: ["fa-IR"], inApp: true }), ["en", "fa"])).toBe("fa");
    expect(detectLang(src({ browser: ["fa-IR"], saved: "en" }), ["en", "fa"])).toBe("en");
  });

  it("offers a previewed language beside the ready ones on every site", () => {
    expect(offeredLangs("zh", "icmbot.one")).toEqual(["en", "zh"]);
    expect(offeredLangs("fa", "icmbot.es")).toEqual(["en", "es", "fa"]);
    expect(offeredLangs("fa", "icmbot.one", READY, true)).toEqual(["en", "es", "fa"]);
    expect(offeredLangs("en", "icmbot.one", ["en", "zh", "fa"])).toEqual(["en", "zh", "fa"]);
  });
});

function Switch() {
  const { setLang } = useI18n();
  return <><button type="button" onClick={() => setLang("en")}>to en</button><button type="button" onClick={() => setLang("zh")}>to zh</button></>;
}

describe("the page in Chinese and Persian", () => {
  it("sets <html lang> and dir: rtl for Persian, back to ltr, zh-Hans for Chinese", () => {
    render(<I18nProvider initial="fa"><Switch /></I18nProvider>);
    expect(document.documentElement).toHaveAttribute("lang", "fa");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    fireEvent.click(screen.getByText("to en"));
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    fireEvent.click(screen.getByText("to zh"));
    expect(document.documentElement).toHaveAttribute("lang", "zh-Hans");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
  });

  it("shows one list in a band when more than two languages are offered, pills otherwise", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(APP_UA);
    render(<I18nProvider initial="fa"><LanguageMenu short /></I18nProvider>);
    const list = screen.getByTestId("lang-select");
    expect(list).toHaveAccessibleName("Language");
    expect(list).toHaveValue("fa");
    expect([...(list as HTMLSelectElement).options].map((o) => [o.textContent, o.lang])).toEqual(
      [["English", "en"], ["Español", "es"], ["فارسی", "fa"]]);
    expect(screen.queryByTestId("lang-en")).toBeNull();
    fireEvent.change(list, { target: { value: "es" } });
    expect(document.documentElement).toHaveAttribute("lang", "es");
    expect(screen.getByTestId("lang-es")).toHaveTextContent("ES"); // two languages: pills again
  });

  it("keeps the full pills on Home whatever the number of languages", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(APP_UA);
    render(<I18nProvider initial="fa"><LanguageMenu /></I18nProvider>);
    expect(screen.queryByTestId("lang-select")).toBeNull();
    expect(screen.getByTestId("lang-fa")).toHaveTextContent("فارسی");
  });
});

const words = (lang: "fa" | "zh") =>
  ({ lang, t: (key: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, key, p) });
const fromTo = (_key: string, p?: Record<string, string>) => `${p?.from} - ${p?.to}`;

describe("numbers, places and dates", () => {
  it("writes Persian digits under fa and 45,000 under zh", () => {
    setCurrentLang("fa");
    expect(formatChips(45_000)).toBe("۴۵٬۰۰۰");
    expect(localNumber(6.5)).toBe("۶٫۵");
    setCurrentLang("zh");
    expect(formatChips(45_000)).toBe("45,000");
    expect(localNumber(6.5)).toBe("6.5");
  });

  it("writes a place from each language's key", () => {
    expect(placeOrdinal("zh", 5)).toBe("第5名");
    expect(placeOrdinal("fa", 5)).toBe("رتبه \u2068۵\u2069"); // the number isolated, plan 113 step 2
    expect(placeOrdinal("es", 5)).toBe("5.º");
    expect([placeOrdinal("en", 1), placeOrdinal("en", 12), placeOrdinal("en", 22, false)]).toEqual(["1ST", "12TH", "22nd"]);
    expect(tournamentState({ tableId: "a", status: "finished", finishPlace: 3 }, null, words("fa"))).toContain("رتبه \u2068۳\u2069");
    expect(tournamentState({ tableId: "a", status: "finished", finishPlace: 3 }, null, words("zh"))).toContain("第3名");
  });

  it("dates the leaderboard week in Solar Hijri under fa and as 11月2日 under zh", () => {
    const week = { weekStart: "2026-11-02T00:00:00Z", weekEnd: "2026-11-08T00:00:00Z" };
    expect(weekDates(week, "fa", fromTo)).toBe("۱۱ آبان - ۱۷ آبان");
    expect(weekDates(week, "zh", fromTo)).toBe("11月2日 - 11月8日");
  });
});

describe("digits typed on a Persian keyboard", () => {
  it("reads Persian and Arabic digits, and the Persian separators", () => {
    expect(parseDigits("۴۵٬۰۰۰")).toBe("45000");
    expect(parseDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(parseDigits("۶٫۵")).toBe("6.5");
    expect(parseDigits("2,400 abc")).toBe("2,400 abc");
  });

  it("bets the amount typed in Persian digits, and shows the box in them", () => {
    const onAction = vi.fn();
    render(<I18nProvider initial="fa"><HeroControls legalActions={[{ kind: "fold" }, { kind: "call" },
      { kind: "raise", minAmount: 200, maxAmount: 45_450 }]} toCall={100} pot={150} stack={45_450} bigBlind={100}
      disabled={false} street="preflop" heroBet={0} actionLog={[]} onAction={onAction} /></I18nProvider>);
    const box = screen.getByTestId("bet-amount");
    expect(box).toHaveValue("۲۵۰");
    fireEvent.change(box, { target: { value: "۶۰۰" } });
    fireEvent.click(screen.getByTestId("size-play"));
    expect(onAction).toHaveBeenCalledWith("raise", 600);
  });
});
