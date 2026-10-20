/* Which language the site speaks (plan 093). */

// Chinese (Simplified, for mainland China) comes after Spanish: a zh.ts and "zh" here.
export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];

/** Each language in its own words, for the language menu. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español" };

/** Languages translated far enough to offer on icmbot.one by the browser's
 * language. Until then a visitor there meets Spanish only on purpose, with
 * ?lang=es, so nobody there sees a half-translated site. */
export const READY: readonly Lang[] = ["en"];

export const LANG_KEY = "icmbot.lang";

const SPANISH_HOST = /(^|\.)icmbot\.es$/;

/** The languages the menu offers: every READY one, the one in use, and Spanish
 * on icmbot.es, so a visitor there who picks English can always come back
 * (the owner, 20 Oct: the buttons vanished after clicking English). */
export function offeredLangs(lang: Lang, host: string, ready: readonly Lang[] = READY): Lang[] {
  return LANGS.filter((l) => ready.includes(l) || l === lang || (l === "es" && SPANISH_HOST.test(host)));
}

export const isLang = (value: string | null | undefined): value is Lang =>
  !!value && (LANGS as readonly string[]).includes(value);

export interface LangSources {
  search: string;
  saved: string | null;
  host: string;
  browser: readonly string[];
}

/** ?lang= first, then the visitor's own choice, then the domain, then the
 * browser (only a READY language), then English. icmbot.es is the Spanish site:
 * it speaks Spanish from the start and each screen turns Spanish as it is
 * translated (the owner, 20 Oct). */
export function detectLang({ search, saved, host, browser }: LangSources, ready: readonly Lang[] = READY): Lang {
  const asked = new URLSearchParams(search).get("lang");
  if (isLang(asked)) return asked;
  if (isLang(saved)) return saved;
  if (SPANISH_HOST.test(host)) return "es";
  const fromBrowser = browser.map((tag) => tag.toLowerCase().split("-")[0]).find((tag) => isLang(tag) && ready.includes(tag));
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
  };
}

/** The value for <html lang>. */
export const htmlLang = (lang: Lang): string => lang;

const NUMBER_LOCALES: Record<Lang, string> = { en: "en-US", es: "es-ES" };
let current: Lang = "en";

/** The language the I18nProvider is rendering in, for plain functions such as
 * formatChips that cannot read React context. */
export function setCurrentLang(lang: Lang): void {
  current = lang;
}

/** formatChips follows the language: 45,000 in English, 45.000 in Spanish (a
 * Spanish reader takes 45,000 for forty-five). Spain leaves 4-digit numbers ungrouped. */
export const numberLocale = (): string => NUMBER_LOCALES[current];

/** A plain number in the language: English as written ("6.5"), Spanish 6,5. */
export const localNumber = (n: number): string => (current === "en" ? String(n) : n.toLocaleString(NUMBER_LOCALES[current]));

const SUFFIX: Record<number, string> = { 1: "ST", 2: "ND", 3: "RD" };

/** A finishing place: 1ST, 2ND, 11TH in English; 1.º, 2.º in Spanish. */
export function placeOrdinal(lang: Lang, n: number): string {
  if (lang === "es") return `${n}.º`;
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? "TH" : (SUFFIX[n % 10] ?? "TH")}`;
}
