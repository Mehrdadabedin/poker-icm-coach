import { useI18n } from "../i18n/I18n";
import { LANG_NAMES, offeredLangs } from "../i18n/lang";

/** Language buttons, each language in its own words (plan 093). Always there
 * on icmbot.es; on icmbot.one once Spanish is READY (or while previewing it). */
export function LanguageMenu({ short = false }: { short?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const offered = offeredLangs(lang, window.location.hostname);
  if (offered.length < 2) return null;
  return (
    <nav className="lang-menu" aria-label={t("lang.label")} data-testid="lang-menu">
      {offered.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => setLang(l)}
          aria-label={LANG_NAMES[l]} data-testid={`lang-${l}`}>
          {short ? l.toUpperCase() : LANG_NAMES[l]}
        </button>
      ))}
    </nav>
  );
}
