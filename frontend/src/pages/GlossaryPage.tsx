import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { useT } from "../i18n/I18n";
import { en, type MessageKey } from "../i18n/messages/en";
import { GROUPS, TERMS, defKey, exKey, nameKey, type Term } from "../glossary/terms";

// "posición" is found by typing "posicion": phones often skip the accent
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** GLOSSARY screen (plan 097): every term the table, the coach and the reports
 * use, by group. ?term=CO opens on that entry and marks it, which is where a
 * tapped term at the table or in a report leads. */
export function GlossaryPage() {
  const t = useT();
  const [params] = useSearchParams();
  const focus = params.get("term");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (focus) document.getElementById(`gl-${focus}`)?.scrollIntoView?.({ block: "center" });
  }, [focus]);

  const text = (term: Term) => [term.abbr ?? "", t(nameKey(term.id)), t(defKey(term.id))].join(" ");
  const wanted = fold(query.trim());
  const shown = TERMS.filter((term) => !wanted || fold(text(term)).includes(wanted));

  return (
    <div className="page glossary-page" data-testid="glossary-page">
      <PageHeader />
      <h1 className="screen-title">{t("glossary.title")}</h1>
      <p className="note">{t("glossary.intro")}</p>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t("glossary.search")} aria-label={t("glossary.search")} data-testid="glossary-search" />
      </div>
      {shown.length === 0 && <p className="note" data-testid="glossary-none">{t("glossary.none", { q: query.trim() })}</p>}
      {GROUPS.map((group) => {
        const terms = shown.filter((term) => term.group === group);
        if (terms.length === 0) return null;
        return (
          <section key={group} className="glossary-group" aria-labelledby={`gl-group-${group}`}>
            <h2 id={`gl-group-${group}`}>{t(`glossary.group.${group}` as MessageKey)}</h2>
            <dl>
              {terms.map((term) => (
                <div key={term.id} id={`gl-${term.id}`} data-testid={`glossary-entry-${term.id}`}
                  className={term.id === focus ? "glossary-entry glossary-focus" : "glossary-entry"}>
                  <dt>
                    {term.abbr && <span className="glossary-abbr">{term.abbr}</span>}
                    {t(nameKey(term.id))}
                  </dt>
                  <dd>{t(defKey(term.id))}</dd>
                  {exKey(term.id) in en && (
                    <dd className="glossary-ex"><b>{t("glossary.example")}:</b> {t(exKey(term.id))}</dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      <Copyright />
    </div>
  );
}
