import { Fragment } from "react";
import { useI18n } from "../i18n/I18n";
import { htmlDir, LANG_NAMES, LANGS } from "../i18n/lang";

/** The languages at the foot of the landing page, each in its own words and
 * script: English · Español · 简体中文 · فارسی (the owner, 6 Nov: all four
 * now, before Persian and Chinese are READY). A tap switches the page, as the
 * language menu does. Each name carries its own lang and dir, so it reads
 * right whatever the page language is. */
export function FooterLanguages() {
  const { lang, setLang, t } = useI18n();
  return (
    <nav className="lm-footer-langs" aria-label={t("lang.label")} data-testid="footer-languages">
      {/* the dots sit between the names, outside them, so a right-to-left name keeps its dot on the outside */}
      {LANGS.map((l, i) => (
        <Fragment key={l}>
          {i > 0 && <span className="lm-footer-dot" aria-hidden="true">·</span>}
          <button type="button" className="lm-footer-lang" lang={l} dir={htmlDir(l)}
            aria-pressed={l === lang} onClick={() => setLang(l)} data-testid={`footer-lang-${l}`}>
            {LANG_NAMES[l]}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
