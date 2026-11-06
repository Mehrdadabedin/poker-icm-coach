/* Which language the site speaks (plan 093). */
import { inAndroidApp } from "../services/platform";
import { translate } from "./translate";

/** Simplified Chinese and Persian (plan 113) are previewed with ?lang=zh and
 * ?lang=fa until each is READY. */
export const LANGS = ["en", "es", "zh", "fa"] as const;
export type Lang = (typeof LANGS)[number];

/** Each language in its own words, for the language menu. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español", zh: "简体中文", fa: "فارسی" };

/** Languages translated far enough to offer on icmbot.one by the browser's
 * language. Until then a visitor there meets Spanish only on purpose, with
 * ?lang=es, so nobody there sees a half-translated site. */
export const READY: readonly Lang[] = ["en"];

export const LANG_KEY = "icmbot.lang";

const SPANISH_HOST = /(^|\.)icmbot\.es$/;

/** Also ready inside the Android app, before the website: the app loads
 * icmbot.one and has no address bar for ?lang=, so the phone's language is the
 * only way in. Chinese joins here only once it is fully translated. */
export const APP_READY: readonly Lang[] = ["en", "es"];

const readyFor = (inApp: boolean, ready: readonly Lang[]): readonly Lang[] =>
  (inApp ? [...ready, ...APP_READY] : ready);

/** The languages the menu offers: every READY one, the one in use, and Spanish
 * on icmbot.es, so a visitor there who picks English can always come back
 * (the owner, 20 Oct: the buttons vanished after clicking English). */
export function offeredLangs(lang: Lang, host: string, ready: readonly Lang[] = READY, inApp = false): Lang[] {
  const shown = readyFor(inApp, ready);
  return LANGS.filter((l) => shown.includes(l) || l === lang || (l === "es" && SPANISH_HOST.test(host)));
}

export const isLang = (value: string | null | undefined): value is Lang =>
  !!value && (LANGS as readonly string[]).includes(value);

export interface LangSources {
  search: string;
  saved: string | null;
  host: string;
  browser: readonly string[];
  inApp: boolean;
}

/** ?lang= first, then the visitor's own choice, then the domain, then the
 * browser (only a READY language, or APP_READY in the app), then English.
 * A browser tag counts by its language alone, so zh-TW and zh-HK get
 * Simplified Chinese until Traditional exists (the owner, 5 Nov).
 * icmbot.es is the Spanish site: it speaks Spanish from the start and each
 * screen turns Spanish as it is translated (the owner, 20 Oct). */
export function detectLang({ search, saved, host, browser, inApp }: LangSources, ready: readonly Lang[] = READY): Lang {
  const asked = new URLSearchParams(search).get("lang");
  if (isLang(asked)) return asked;
  if (isLang(saved)) return saved;
  if (SPANISH_HOST.test(host)) return "es";
  const usable = readyFor(inApp, ready);
  const fromBrowser = browser.map((tag) => tag.toLowerCase().split("-")[0]).find((tag) => isLang(tag) && usable.includes(tag));
  return isLang(fromBrowser) ? fromBrowser : "en";
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // private windows may refuse storage; the choice then lasts the visit
  }
}

export function currentSources(): LangSources {
  return {
    search: window.location.search,
    saved: readSaved(),
    host: window.location.hostname,
    browser: navigator.languages?.length ? navigator.languages : [navigator.language],
    inApp: inAndroidApp(),
  };
}

/** The value for <html lang>: zh-Hans makes the browser pick Simplified glyphs. */
export const htmlLang = (lang: Lang): string => (lang === "zh" ? "zh-Hans" : lang);

/** The value for <html dir>: Persian reads right to left. */
export const htmlDir = (lang: Lang): "ltr" | "rtl" => (lang === "fa" ? "rtl" : "ltr");

/** fa-IR writes Persian digits (۴۵٬۰۰۰) and Solar Hijri dates, both the
 * owner's choice (5 Nov); zh-CN writes 45,000 and 6.5 like English. */
const LOCALES: Record<Lang, string> = { en: "en-US", es: "es-ES", zh: "zh-CN", fa: "fa-IR" };

/** The Intl locale for numbers and dates in a language. */
export const localeOf = (lang: Lang): string => LOCALES[lang];
let current: Lang = "en";

/** The language the I18nProvider is rendering in, for plain functions such as
 * formatChips that cannot read React context. */
export function setCurrentLang(lang: Lang): void {
  current = lang;
}

/** formatChips follows the language: 45,000 in English, 45.000 in Spanish (a
 * Spanish reader takes 45,000 for forty-five). Spain leaves 4-digit numbers ungrouped. */
export const numberLocale = (): string => LOCALES[current];

/** A plain number in the language: English as written ("6.5"), Spanish 6,5, Persian ۶٫۵. */
export const localNumber = (n: number): string => (current === "en" ? String(n) : n.toLocaleString(LOCALES[current]));

/** A number with fixed decimals in the language: 12.50 in English, 12,50 in Spanish. */
export const localFixed = (n: number, digits: number): string => (current === "en" ? n.toFixed(digits)
  : n.toLocaleString(LOCALES[current], { minimumFractionDigits: digits, maximumFractionDigits: digits }));

const SUFFIX: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };

/** A finishing place: 1ST (or 1st), 11TH in English; the other languages from
 * the "place.ordinal" key: 1.º, 第1名, رتبه ۱. */
export function placeOrdinal(lang: Lang, n: number, upper = true): string {
  if (lang !== "en") {
    const digits = n.toLocaleString(LOCALES[lang], { useGrouping: false });
    return translate(lang, "place.ordinal", { n: digits });
  }
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const english = `${n}${teen ? "th" : (SUFFIX[n % 10] ?? "th")}`;
  return upper ? english.toUpperCase() : english;
}
