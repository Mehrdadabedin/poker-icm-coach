import { useI18n } from "../i18n/I18n";
import { isLang, LANG_NAMES, offeredLangs } from "../i18n/lang";

/** Language buttons, each language in its own words (plan 093), on every site
 * and in the app (the owner, 6 Nov). In the narrow bands (`short`) four pills
 * do not fit beside Log in at 360 px, so there it is one list, which Android
 * opens in its own picker (plan 113). */
export function LanguageMenu({ short = false }: { short?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const offered = offeredLangs();
  if (short && offered.length > 2) {
    return (
      <nav className="lang-menu" data-testid="lang-menu">
        {/* a globe, not flags: a language is not one country (the owner, 6 Nov) */}
        <span className="lang-pick">
          <svg className="lang-globe" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" data-testid="lang-globe">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9M12 3c-2.5 2.7-3.8 5.7-3.8 9s1.3 6.3 3.8 9" />
          </svg>
          <select className="lang-select" aria-label={t("lang.label")} value={lang} data-testid="lang-select"
            onChange={(e) => { if (isLang(e.target.value)) setLang(e.target.value); }}>
            {offered.map((l) => <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>)}
          </select>
        </span>
      </nav>
    );
  }
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
