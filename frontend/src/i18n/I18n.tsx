import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { currentSources, detectLang, htmlLang, isLang, saveLang, setCurrentLang, type Lang } from "./lang";
import type { MessageKey } from "./messages/en";
import { translate, type Params } from "./translate";

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Params) => string;
}

// Without a provider (most component tests) everything reads in English.
const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key, params) => translate("en", key, params),
});

/** The site's language (plan 093), detected once and changed from the language
 * menu; a choice is remembered, and so is a language asked for with ?lang=. */
export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const sources = currentSources();
    const asked = new URLSearchParams(sources.search).get("lang");
    if (!initial && isLang(asked)) saveLang(asked);
    return initial ?? detectLang(sources);
  });
  setCurrentLang(lang); // during render, so formatChips below already follows it
  useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
  }, [lang]);
  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
  }, []);
  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function useT(): I18nValue["t"] {
  return useContext(I18nContext).t;
}
