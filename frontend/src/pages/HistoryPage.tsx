import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { HistoryFiltersBar } from "../components/HistoryFiltersBar";
import { PageHeader } from "../components/PageHeader";
import { actionWord } from "../i18n/coach";
import { useI18n } from "../i18n/I18n";
import { formatChips } from "../models/game";
import {
  NO_FILTERS, filterHands, tournamentLabel, winnerNames,
  type HandRow, type HistoryFilters, type TournamentRow,
} from "../models/history";

/** HAND HISTORY (plan 077): the user's tournaments in a list, newest first,
 * with the live table selected; its hands grouped by blind level, winners by
 * name, and filters. Saved tournaments come from the history database (plan
 * 076); the live table's hands come from the table itself, so the list still
 * works where no history is saved. A Report leak links here with
 * ?table=<id>&hand=<n>: that tournament opens with the hand marked (078). */
export function HistoryPage() {
  const [params] = useSearchParams();
  const words = useI18n();
  const { t } = words;
  const grade = (g: string | null) => (g ? t(`coach.grade.${g}` as "coach.grade.PREFERRED") : "—");
  const linked = { table: params.get("table"), hand: Number(params.get("hand")) || null };
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [hands, setHands] = useState<HandRow[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const live = request<{ tableId: string | null; tableLabel: string | null }>("/api/active-table")
      .catch(() => ({ tableId: null, tableLabel: null }));
    const saved = request<{ tournaments: TournamentRow[] }>("/api/history/tournaments")
      .then((d) => d.tournaments).catch(() => [] as TournamentRow[]);
    void Promise.all([live, saved]).then(([active, list]) => {
      const rows = active.tableId && !list.some((row) => row.tableId === active.tableId)
        ? [{ tableId: active.tableId, tableLabel: active.tableLabel ?? "", startedAt: null, endedAt: null,
             status: "active", finishPlace: null, hands: 0 }, ...list]
        : list;
      setTournaments(rows);
      setLiveId(active.tableId);
      setLoaded(true);
      const wanted = rows.some((r) => r.tableId === linked.table) ? linked.table : null;
      const first = wanted ?? active.tableId ?? rows[0]?.tableId;
      if (first) choose(first, active.tableId);
    });
  }, []);

  const choose = (id: string, live: string | null = liveId) => {
    setSelected(id);
    setFilters(NO_FILTERS);
    const path = id === live ? `/api/game/${id}/hands` : `/api/history/tournaments/${id}/hands`;
    request<{ hands: HandRow[] }>(path).then((d) => setHands(d.hands)).catch(() => setHands([]));
  };

  const focus = selected === linked.table ? linked.hand : null;
  useEffect(() => {
    if (focus === null) return;
    document.querySelector(`[data-testid="history-hand-${focus}"]`)?.scrollIntoView?.({ block: "center" });
  }, [focus, hands]);

  const shown = filterHands(hands, filters);
  const groups = new Map<number, HandRow[]>();
  for (const h of shown) groups.set(h.level, [...(groups.get(h.level) ?? []), h]);

  return (
    <div className="page" data-testid="history-page">
      <PageHeader />
      <h1 className="screen-title">{t("hh.title")}</h1>
      {!loaded && <p className="note">{t("hh.loading")}</p>}
      {loaded && tournaments.length === 0 && (
        <p className="note" data-testid="history-none">{t("hh.none")}</p>
      )}
      {tournaments.length > 0 && (
        <>
          <div className="toolbar">
            <select value={selected} onChange={(e) => choose(e.target.value)} aria-label={t("hh.tournament")}
              data-testid="history-tournament">
              {tournaments.map((row) => <option key={row.tableId} value={row.tableId}>{tournamentLabel(row, liveId, words)}</option>)}
            </select>
          </div>
          <HistoryFiltersBar hands={hands} filters={filters} onChange={setFilters} />
          <p className="note" data-testid="history-count">
            {shown.length === hands.length
              ? t(hands.length === 1 ? "hh.completed.one" : "hh.completed.other", { n: hands.length })
              : t("hh.match", { shown: shown.length, n: hands.length })}
          </p>
        </>
      )}
      {[...groups.entries()].map(([level, rows]) => (
        <div key={level} className="history-group" data-testid={`history-level-${level}`}>
          <h3 className="history-group-title">{t("hh.level", { n: level, blinds: rows[0].blindLevel })}</h3>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>{t("hh.col.pos")}</th><th>{t("hh.col.pot")}</th><th>{t("hh.col.winners")}</th>
                <th>{t("hh.col.net")}</th><th>{t("hh.col.you")}</th><th>{t("hh.col.coach")}</th><th>{t("hh.col.grade")}</th></tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.handNumber} data-testid={`history-hand-${h.handNumber}`}
                  className={h.handNumber === focus ? "history-focus" : undefined}>
                  <td>{h.handNumber}</td><td>{h.heroPosition}</td><td>{formatChips(h.pot)}</td>
                  <td>{winnerNames(h, words)}</td>
                  <td className={h.net >= 0 ? "pos" : "neg"}>{h.net >= 0 ? "+" : ""}{formatChips(h.net)}</td>
                  <td>{h.heroDecision ? actionWord(h.heroDecision, t) : "—"}</td>
                  <td>{h.coachRecommendation ? actionWord(h.coachRecommendation, t) : "—"}</td>
                  <td>{grade(h.grade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <Copyright />
    </div>
  );
}
