/* MY MISTAKES (plan 062): every decision the coach graded SUBOPTIMAL at the
 * active table, grouped by what went wrong, newest hand first. The verdicts
 * come from the hand history, which keeps the coach's call for each decision. */
import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { MistakeCard, type Decision, type Mistake } from "../components/MistakeCard";

type HandRow = {
  handNumber: number; heroPosition: string; level: number; blindLevel: string;
  heroCards: string[]; decisions: Decision[];
};

const CATEGORIES = [
  { key: "call", label: "Wrong call", match: (a: string) => a === "CALL" },
  { key: "allin", label: "Wrong all-in", match: (a: string) => a === "ALL-IN" },
  { key: "fold", label: "Wrong fold", match: (a: string) => a === "FOLD" },
  { key: "other", label: "Other", match: (a: string) => !["CALL", "ALL-IN", "FOLD"].includes(a) },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"] | "all";

/** Newest hand first; within a hand, decisions stay in street order. */
function mistakesOf(hands: HandRow[]): Mistake[] {
  return hands.reduceRight<Mistake[]>((acc, h) => acc.concat(h.decisions
    .filter((d) => d.grade === "SUBOPTIMAL")
    .map((d) => ({ handNumber: h.handNumber, heroCards: h.heroCards, heroPosition: h.heroPosition,
                   level: h.level, blindLevel: h.blindLevel, decision: d }))), []);
}

export function MistakesPage() {
  const [hands, setHands] = useState<HandRow[]>([]);
  const [status, setStatus] = useState<"loading" | "noTable" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<CategoryKey>("all");

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
  const decided = hands.reduce((n, h) => n + h.decisions.length, 0);
  const active = CATEGORIES.find((c) => c.key === filter);
  const shown = active ? all.filter((m) => active.match(m.decision.heroAction)) : all;

  return (
    <div className="page" data-testid="mistakes-page">
      <PageHeader />
      <h1 className="screen-title">MY MISTAKES</h1>
      {status === "loading" && <p className="note">Loading your active table…</p>}
      {status === "noTable" && (
        <p className="note" data-testid="mistakes-no-table">No active table yet. Play a practice session first.</p>
      )}
      {status === "error" && <p className="note" data-testid="mistakes-error">Could not load your hands. Please try again.</p>}
      {status === "ready" && (
        <>
          <p className="note" data-testid="mistakes-summary">
            {all.length} mistake{all.length === 1 ? "" : "s"} in {decided} decision{decided === 1 ? "" : "s"} over {hands.length} hand{hands.length === 1 ? "" : "s"}.
          </p>
          <div className="mistakes-filters" role="group" aria-label="Filter mistakes">
            <button type="button" className={filter === "all" ? "mistakes-filter active" : "mistakes-filter"}
              onClick={() => setFilter("all")} data-testid="mistakes-filter-all">All ({all.length})</button>
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={filter === c.key ? "mistakes-filter active" : "mistakes-filter"}
                onClick={() => setFilter(c.key)} data-testid={`mistakes-filter-${c.key}`}>
                {c.label} ({all.filter((m) => c.match(m.decision.heroAction)).length})
              </button>
            ))}
          </div>
          {all.length === 0 ? (
            <p className="note" data-testid="mistakes-none">
              No mistakes yet: every decision matched the coach or was a close alternative.
            </p>
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
