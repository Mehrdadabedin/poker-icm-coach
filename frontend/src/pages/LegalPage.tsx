import { Link } from "react-router-dom";
import { OPERATOR } from "../legal/operator";
import { MinimalFooter } from "../landing-minimal/MinimalFooter";
import { MinimalHeader } from "../landing-minimal/MinimalHeader";
import { useI18n } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

const SECTIONS = { terms: 11, privacy: 9 } as const;
const UPDATED = new Date(2026, 9, 31);

/** The Terms and Conditions or the Privacy Policy, open to everyone without an
 * account, so a link to them works for a visitor and in a store listing. */
export function LegalPage({ doc }: { doc: keyof typeof SECTIONS }) {
  const { t, lang } = useI18n();
  const numbers = Array.from({ length: SECTIONS[doc] }, (_, i) => i + 1);
  const date = UPDATED.toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="lm-page" data-testid={`legal-${doc}`}>
      <MinimalHeader />
      <main className="lm-main lm-legal">
        <Link className="lm-footer-link" to="/">{t("legal.back")}</Link>
        <h1>{t(`legal.${doc}`)}</h1>
        <p className="lm-legal-date">{t("legal.updated", { date })}</p>
        {numbers.map((n) => (
          <section key={n}>
            <h2>{t(`legal.${doc}.${n}.title` as MessageKey)}</h2>
            <p>{t(`legal.${doc}.${n}.body` as MessageKey, OPERATOR[lang])}</p>
          </section>
        ))}
      </main>
      <MinimalFooter />
    </div>
  );
}
