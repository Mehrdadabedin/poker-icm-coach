import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { ProgressChart, StackChart } from "../components/ReportCharts";
import { ReportBetSizes } from "../components/ReportBetSizes";
import { Leaks, MistakeMap, MistakeTypes, PlayerStats, SummaryCards } from "../components/ReportSections";
import { tournamentLabel, tournamentState, type TournamentRow } from "../models/history";
import { PERIODS, type Period, type Report } from "../models/report";
import { useI18n } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";
import { formatChips } from "../models/game";

const day = (iso: string, lang: string) => new Date(iso)
  .toLocaleDateString(lang === "en" ? undefined : numberLocale(), { day: "numeric", month: "short" });

/** REPORT (plan 078): one ready-made report from the saved history. Two
 * filters only: a tournament, or a period. The backend computes every number;
 * this page lays them out. */
export function ReportPage() {
  const words = useI18n();
  const { t } = words;
  const [period, setPeriod] = useState<Period>("30d");
  const [tournament, setTournament] = useState("");
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    request<{ tableId: string | null }>("/api/active-table")
      .then((d) => setLiveId(d.tableId)).catch(() => undefined);
    request<{ tournaments: TournamentRow[] }>("/api/history/tournaments")
      .then((d) => setTournaments(d.tournaments.filter((row) => row.hands > 0))).catch(() => undefined);
  }, []);

  useEffect(() => {
    let current = true;
    setStatus("loading");
    const query = tournament ? `tournament=${encodeURIComponent(tournament)}` : `period=${period}`;
    request<Report>(`/api/history/report?${query}`)
      .then((r) => { if (current) { setReport(r); setStatus("ready"); } })
      .catch(() => { if (current) setStatus("error"); });
    return () => { current = false; };
  }, [period, tournament]);

  const labels = new Map(tournaments.map((row) => [row.tableId, row.tableLabel]));
  const shown = status === "ready" ? report : null;
  const stack = shown?.stack;

  return (
    <div className="page report-page" data-testid="report-page">
      <PageHeader />
      <h1 className="screen-title">{t("report.title")}</h1>
      <div className="toolbar">
        <select value={tournament} onChange={(e) => setTournament(e.target.value)} aria-label={t("hh.tournament")}
          data-testid="report-tournament">
          <option value="">{t("report.allTournaments")}</option>
          {tournaments.map((row) => <option key={row.tableId} value={row.tableId}>{tournamentLabel(row, liveId, words)}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label={t("report.period")}
          disabled={tournament !== ""} title={tournament ? t("report.wholeTournament") : undefined}
          data-testid="report-period">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{t(`report.period.${p.value}`)}</option>)}
        </select>
      </div>
      {status === "loading" && <p className="note">{t("report.loading")}</p>}
      {status === "error" && <p className="note" data-testid="report-error">{t("report.error")}</p>}
      {shown && shown.summary.tournaments === 0 && (
        <p className="note" data-testid="report-empty">
          {t("report.empty")}
        </p>
      )}
      {shown && shown.summary.tournaments > 0 && (
        <>
          <p className="note" data-testid="report-count">
            {t("report.count", { hands: formatChips(shown.summary.hands), decisions: formatChips(shown.summary.decisions) })}
          </p>
          <SummaryCards summary={shown.summary} period={shown.period} />
          {stack && (
            <section className="report-card">
              <h2>{t("report.stackTitle", { label: stack.tableLabel, day: day(stack.startedAt, words.lang).toUpperCase() })}</h2>
              <p className="report-sub">
                {t("report.stackSub")}
                {" "}{tournamentState(stack, liveId, words).replace(/^./, (c) => c.toUpperCase())}.
              </p>
              <StackChart stack={stack} />
            </section>
          )}
          <div className="report-two">
            <section className="report-card">
              <h2>{t("report.mapTitle")}</h2>
              <p className="report-sub">{t("report.mapSub")}</p>
              <MistakeMap heatmap={shown.heatmap} />
            </section>
            <section className="report-card">
              <h2>{t("report.leaksTitle")}</h2>
              <p className="report-sub">{t("report.leaksSub")}</p>
              <Leaks leaks={shown.leaks} labels={labels} />
              <h2 className="report-h2-gap">{t("report.typesTitle")}</h2>
              <MistakeTypes types={shown.mistakeTypes} />
            </section>
          </div>
          <div className="report-two">
            <section className="report-card">
              <h2>{t("report.statsTitle")}</h2>
              <p className="report-sub">{t("report.statsSub")}</p>
              <PlayerStats stats={shown.stats} />
            </section>
            <section className="report-card">
              <h2>{t("report.progressTitle")}</h2>
              <p className="report-sub">
                {t("report.progressSub")}{" "}
                <span className="legend-agree">{t("report.legendAgree")}</span>{" "}
                <span className="legend-miss">{t("report.legendMiss")}</span>
              </p>
              {shown.progress.length > 1
                ? <ProgressChart points={shown.progress} />
                : <p className="note" data-testid="report-progress-one">
                  {t(tournament ? "report.progressPickAll" : "report.progressTwo")}
                </p>}
            </section>
          </div>
          {shown.betSizes && shown.betSizes.length > 0 && (
            <section className="report-card">
              <h2>{t("report.betTitle")}</h2>
              <p className="report-sub">{t("report.betSub")}</p>
              <ReportBetSizes key={`${shown.period}-${shown.tournament ?? ""}`} sizes={shown.betSizes} />
            </section>
          )}
        </>
      )}
      <Copyright />
    </div>
  );
}
