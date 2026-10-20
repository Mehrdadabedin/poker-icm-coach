/* MY MISTAKES (plan 062): every decision the coach graded SUBOPTIMAL at the
 * active table, grouped by what went wrong, newest hand first. The verdicts
 * come from the hand history, which keeps the coach's call for each decision.
 * Mistakes in hands the hero won stay listed, marked WON, and can be hidden
 * (plan 070): winning does not make the decision right. */
import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { MistakeCard, type Decision, type Mistake } from "../components/MistakeCard";
import { useT } from "../i18n/I18n";

type HandRow = {
  handNumber: number; heroPosition: string; level: number; blindLevel: string;
  heroCards: string[]; decisions: Decision[]; net: number;
};

const CATEGORIES = [
  { key: "call", label: "mistakes.call", match: (a: string) => a === "CALL" },
  { key: "allin", label: "mistakes.allin", match: (a: string) => a === "ALL-IN" },
  { key: "fold", label: "mistakes.fold", match: (a: string) => a === "FOLD" },
  { key: "other", label: "mistakes.other", match: (a: string) => !["CALL", "ALL-IN", "FOLD"].includes(a) },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"] | "all";

/** Newest hand first; within a hand, decisions stay in street order. */
function mistakesOf(hands: HandRow[]): Mistake[] {
  return hands.reduceRight<Mistake[]>((acc, h) => acc.concat(h.decisions
    .filter((d) => d.grade === "SUBOPTIMAL")
    .map((d) => ({ handNumber: h.handNumber, heroCards: h.heroCards, heroPosition: h.heroPosition,
                   level: h.level, blindLevel: h.blindLevel, decision: d, won: h.net > 0 }))), []);
}

export function MistakesPage() {
  const t = useT();
  const count = (n: number, key: "mistakes.count" | "mistakes.decisions" | "mistakes.hands") =>
    t(n === 1 ? `${key}.one` : `${key}.other`, { n });
  const [hands, setHands] = useState<HandRow[]>([]);
  const [status, setStatus] = useState<"loading" | "noTable" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<CategoryKey>("all");
  const [hideWon, setHideWon] = useState(false);

  useEffect(() => {
    request<{ tableId: string | null }>("/api/active-table")
      .then((d) => {
        if (!d.tableId) { setStatus("noTable"); return undefined; }
        return request<{ hands: HandRow[] }>(`/api/game/${d.tableId}/hands`)
          .then((data) => { setHands(data.hands); setStatus("ready"); });
      })
      .catch(() => setStatus("error"));
  }, []);

  const all = mistakesOf(hands);
  const wonCount = all.filter((m) => m.won).length;
  const visible = hideWon ? all.filter((m) => !m.won) : all;
  const decided = hands.reduce((n, h) => n + h.decisions.length, 0);
  const active = CATEGORIES.find((c) => c.key === filter);
  const shown = active ? visible.filter((m) => active.match(m.decision.heroAction)) : visible;

  return (
    <div className="page" data-testid="mistakes-page">
      <PageHeader />
      <h1 className="screen-title">{t("mistakes.title")}</h1>
      {status === "loading" && <p className="note">{t("mistakes.loading")}</p>}
      {status === "noTable" && (
        <p className="note" data-testid="mistakes-no-table">{t("mistakes.noTable")}</p>
      )}
      {status === "error" && <p className="note" data-testid="mistakes-error">{t("mistakes.error")}</p>}
      {status === "ready" && (
        <>
          <p className="note" data-testid="mistakes-summary">
            {t("mistakes.summary", { mistakes: count(all.length, "mistakes.count"),
              decisions: count(decided, "mistakes.decisions"), hands: count(hands.length, "mistakes.hands") })}
            {wonCount > 0 ? t("mistakes.inWon", { n: wonCount }) : "."}
          </p>
          <div className="mistakes-filters" role="group" aria-label={t("mistakes.filterLabel")}>
            <button type="button" className={filter === "all" ? "mistakes-filter active" : "mistakes-filter"}
              onClick={() => setFilter("all")} data-testid="mistakes-filter-all">{t("mistakes.all", { n: visible.length })}</button>
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={filter === c.key ? "mistakes-filter active" : "mistakes-filter"}
                onClick={() => setFilter(c.key)} data-testid={`mistakes-filter-${c.key}`}>
                {t(c.label, { n: visible.filter((m) => c.match(m.decision.heroAction)).length })}
              </button>
            ))}
            {wonCount > 0 && (
              <button type="button" className={hideWon ? "mistakes-filter active" : "mistakes-filter"}
                aria-pressed={hideWon} onClick={() => setHideWon((v) => !v)} data-testid="mistakes-hide-won">
                {t("mistakes.hideWon", { n: wonCount })}
              </button>
            )}
          </div>
          {all.length === 0 ? (
            <p className="note" data-testid="mistakes-none">
              {t("mistakes.none")}
            </p>
          ) : shown.length === 0 ? (
            <p className="note" data-testid="mistakes-none-shown">{t("mistakes.noneShown")}</p>
          ) : (
            <div className="mistakes-list">
              {shown.map((m) => <MistakeCard key={`${m.handNumber}-${m.decision.street}-${m.decision.heroAction}`} mistake={m} />)}
            </div>
          )}
        </>
      )}
      <Copyright />
    </div>
  );
}
