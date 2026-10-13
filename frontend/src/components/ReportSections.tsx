import { Link } from "react-router-dom";
import {
  STAT_LABELS, TYPE_LABELS, change, heatColour, historyLink, leakText, statVerdict,
  type Leak, type Period, type PlayerStat, type Report, type Summary,
} from "../models/report";

/* The Report's sections (plan 078) that are cards, tables and bars. */

export function SummaryCards({ summary, period }: { summary: Summary; period: Period }) {
  const agree = change(summary.agreement, summary.previous?.agreement, period, true);
  const miss = change(summary.mistakesPer100, summary.previous?.mistakesPer100, period, false);
  const cards: [string, string, ReturnType<typeof change>][] = [
    ["Tournaments", String(summary.tournaments), null],
    ["Wins", String(summary.wins), null],
    ["Top 3 finishes", String(summary.top3), null],
    ["Average finish", summary.averageFinish === null ? "—" : String(summary.averageFinish), null],
    ["Coach agreement", summary.agreement === null ? "—" : `${summary.agreement}%`, agree],
    ["Mistakes / 100 hands", summary.mistakesPer100 === null ? "—" : String(summary.mistakesPer100), miss],
  ];
  return (
    <div className="report-kpis" data-testid="report-summary">
      {cards.map(([label, value, delta]) => (
        <div className="report-kpi" key={label}>
          <b>{value}</b>
          <span>{label}</span>
          {delta && <i className={delta.good ? "good" : "bad"}>{delta.text}</i>}
        </div>
      ))}
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MistakeMap({ heatmap }: { heatmap: Report["heatmap"] }) {
  const rows = heatmap.positions.filter((p) => heatmap.cells.some((c) => c.position === p));
  if (rows.length === 0) return <p className="note">No decisions yet.</p>;
  return (
    <div className="report-scroll">
      <table className="report-heat" data-testid="report-heatmap">
        <thead><tr><th />{heatmap.streets.map((s) => <th key={s}>{capital(s)}</th>)}</tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p} data-testid={`report-heat-${p}`}>
              <th>{p}</th>
              {heatmap.streets.map((s) => {
                const c = heatmap.cells.find((cell) => cell.position === p && cell.street === s);
                if (!c) return <td key={s} className="heat-empty">—</td>;
                const rate = c.mistakes / c.decisions;
                return (
                  <td key={s} style={{ background: heatColour(rate) }} title={`${c.mistakes} of ${c.decisions} decisions`}>
                    {Math.round(rate * 100)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Leaks({ leaks, labels }: { leaks: Leak[]; labels: Map<string, string> }) {
  if (leaks.length === 0) return <p className="note" data-testid="report-no-leaks">No mistakes in this period.</p>;
  return (
    <ol className="report-leaks">
      {leaks.map((l, i) => (
        <li key={leakText(l)} data-testid={`report-leak-${i + 1}`}>
          <span className="leak-text">{leakText(l)}</span>
          <span className="leak-count">{l.count} time{l.count === 1 ? "" : "s"}</span>
          <span className="leak-hands">
            {l.hands.map((h) => (
              <Link key={`${h.tableId}-${h.handNumber}`} to={historyLink(h.tableId, h.handNumber)}>
                {labels.has(h.tableId) ? `Table ${labels.get(h.tableId)} ` : ""}#{h.handNumber}
              </Link>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function MistakeTypes({ types }: { types: Report["mistakeTypes"] }) {
  const most = Math.max(1, ...types.map((t) => t.count));
  return (
    <div className="report-bars" data-testid="report-types">
      {types.map((t) => (
        <div className="report-bar" key={t.type} data-testid={`report-type-${t.type}`}>
          <span>{TYPE_LABELS[t.type]}</span>
          <span className="bar-track"><span className={`bar bar-${t.type}`} style={{ width: t.count ? `${Math.max(2, (t.count * 100) / most)}%` : 0 }} /></span>
          <b>{t.count}</b>
        </div>
      ))}
    </div>
  );
}

export function PlayerStats({ stats }: { stats: PlayerStat[] }) {
  return (
    <div className="report-scroll">
      <table className="data-table report-stats" data-testid="report-stats">
        <thead><tr><th>Stat</th><th>You</th><th>Range</th><th /></tr></thead>
        <tbody>
          {stats.map((s) => {
            const verdict = statVerdict(s);
            return (
              <tr key={s.key} data-testid={`report-stat-${s.key}`}>
                <td>{STAT_LABELS[s.key] ?? s.key}</td>
                <td>{s.value === null ? "—" : `${s.value}%`}</td>
                <td>{s.low}–{s.high}%</td>
                <td className={`verdict-${verdict.tone}`}>{verdict.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
