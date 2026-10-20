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

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** REPORT (plan 078): one ready-made report from the saved history. Two
 * filters only: a tournament, or a period. The backend computes every number;
 * this page lays them out. */
export function ReportPage() {
  const words = useI18n();
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
      .then((d) => setTournaments(d.tournaments.filter((t) => t.hands > 0))).catch(() => undefined);
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

  const labels = new Map(tournaments.map((t) => [t.tableId, t.tableLabel]));
  const shown = status === "ready" ? report : null;
  const stack = shown?.stack;

  return (
    <div className="page report-page" data-testid="report-page">
      <PageHeader />
      <h1 className="screen-title">REPORT</h1>
      <div className="toolbar">
        <select value={tournament} onChange={(e) => setTournament(e.target.value)} aria-label="Tournament"
          data-testid="report-tournament">
          <option value="">All tournaments</option>
          {tournaments.map((t) => <option key={t.tableId} value={t.tableId}>{tournamentLabel(t, liveId, words)}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Period"
          disabled={tournament !== ""} title={tournament ? "A chosen tournament is shown whole" : undefined}
          data-testid="report-period">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      {status === "loading" && <p className="note">Loading your report…</p>}
      {status === "error" && <p className="note" data-testid="report-error">Could not load your report. Please try again.</p>}
      {shown && shown.summary.tournaments === 0 && (
        <p className="note" data-testid="report-empty">
          No saved tournaments in this period. Play a practice tournament, or choose All time.
        </p>
      )}
      {shown && shown.summary.tournaments > 0 && (
        <>
          <p className="note" data-testid="report-count">
            {shown.summary.hands.toLocaleString()} hands, {shown.summary.decisions.toLocaleString()} decisions graded by the coach
          </p>
          <SummaryCards summary={shown.summary} period={shown.period} />
          {stack && (
            <section className="report-card">
              <h2>STACK GRAPH · TABLE {stack.tableLabel}, {day(stack.startedAt).toUpperCase()}</h2>
              <p className="report-sub">
                Your chips after each hand; shaded bands are blind levels, red dots are hands with a mistake.
                {" "}{tournamentState(stack, liveId, words).replace(/^./, (c) => c.toUpperCase())}.
              </p>
              <StackChart stack={stack} />
            </section>
          )}
          <div className="report-two">
            <section className="report-card">
              <h2>WHERE YOU MAKE MISTAKES</h2>
              <p className="report-sub">Share of your decisions the coach graded a mistake, by position and street.</p>
              <MistakeMap heatmap={shown.heatmap} />
            </section>
            <section className="report-card">
              <h2>TOP 3 LEAKS</h2>
              <p className="report-sub">The mistakes you repeat most. Each hand opens in Hand History.</p>
              <Leaks leaks={shown.leaks} labels={labels} />
              <h2 className="report-h2-gap">MISTAKES BY TYPE</h2>
              <MistakeTypes types={shown.mistakeTypes} />
            </section>
          </div>
          <div className="report-two">
            <section className="report-card">
              <h2>PLAYER STATS</h2>
              <p className="report-sub">Your numbers next to a usual range for a 9-player tournament table.</p>
              <PlayerStats stats={shown.stats} />
            </section>
            <section className="report-card">
              <h2>PROGRESS</h2>
              <p className="report-sub">
                One point per tournament, last 12.{" "}
                <span className="legend-agree">Gold: coach agreement %.</span>{" "}
                <span className="legend-miss">Red: mistakes per 100 hands.</span>
              </p>
              {shown.progress.length > 1
                ? <ProgressChart points={shown.progress} />
                : <p className="note" data-testid="report-progress-one">
                  {tournament ? "Choose All tournaments to see progress over time."
                    : "Progress shows once this period has two tournaments or more."}
                </p>}
            </section>
          </div>
          {shown.betSizes && shown.betSizes.length > 0 && (
            <section className="report-card">
              <h2>BET SIZES</h2>
              <p className="report-sub">How big your first bet on each street is, as a share of the pot. Raises are not counted.</p>
              <ReportBetSizes key={`${shown.period}-${shown.tournament ?? ""}`} sizes={shown.betSizes} />
            </section>
          )}
        </>
      )}
      <Copyright />
    </div>
  );
}
