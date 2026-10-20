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
  if (/(^|\.)icmbot\.es$/.test(host)) return "es";
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
