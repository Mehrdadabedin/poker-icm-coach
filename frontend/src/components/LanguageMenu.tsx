import { useI18n } from "../i18n/I18n";
import { LANG_NAMES, LANGS, READY } from "../i18n/lang";

/** Language buttons, each language in its own words (plan 093). Hidden while
 * English is the only language ready, except to someone previewing another
 * one with ?lang=, who then also gets English back. */
export function LanguageMenu() {
  const { lang, setLang, t } = useI18n();
  const offered = LANGS.filter((l) => READY.includes(l) || l === lang);
  if (offered.length < 2) return null;
  return (
    <nav className="lang-menu" aria-label={t("lang.label")} data-testid="lang-menu">
      {offered.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => setLang(l)}
          data-testid={`lang-${l}`}>
          {LANG_NAMES[l]}
        </button>
      ))}
    </nav>
  );
}
