import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";
import { localNumber } from "../i18n/lang";
import { en, type MessageKey } from "../i18n/messages/en";
import { STAT_TERM } from "../glossary/terms";
import { GlossaryTerm, LinkedText } from "./GlossaryTerm";
import {
  change, heatColour, historyLink, leakText, statVerdict,
  type Leak, type Period, type PlayerStat, type Report, type Summary,
} from "../models/report";

/* The Report's sections (plan 078) that are cards, tables and bars. */

const num = (n: number | null, unit = "") => (n === null ? "—" : `${localNumber(n)}${unit}`);

export function SummaryCards({ summary, period }: { summary: Summary; period: Period }) {
  const t = useT();
  const agree = change(summary.agreement, summary.previous?.agreement, period, true, t);
  const miss = change(summary.mistakesPer100, summary.previous?.mistakesPer100, period, false, t);
  const cards: [string, string, ReturnType<typeof change>, string?][] = [
    [t("report.kpi.tournaments"), String(summary.tournaments), null],
    [t("report.kpi.wins"), String(summary.wins), null],
    [t("report.kpi.top3"), String(summary.top3), null],
    [t("report.kpi.average"), num(summary.averageFinish), null, "averageFinish"],
    [t("report.kpi.agreement"), num(summary.agreement, "%"), agree, "agreement"],
    [t("report.kpi.mistakes"), num(summary.mistakesPer100), miss, "mistakesPer100"],
  ];
  return (
    <div className="report-kpis" data-testid="report-summary">
      {cards.map(([label, value, delta, term]) => (
        <div className="report-kpi" key={label}>
          <b>{value}</b>
          <span>{term ? <GlossaryTerm id={term}>{label}</GlossaryTerm> : label}</span>
          {delta && <i className={delta.good ? "good" : "bad"}>{delta.text}</i>}
        </div>
      ))}
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MistakeMap({ heatmap }: { heatmap: Report["heatmap"] }) {
  const t = useT();
  const rows = heatmap.positions.filter((p) => heatmap.cells.some((c) => c.position === p));
  if (rows.length === 0) return <p className="note">{t("report.noDecisions")}</p>;
  return (
    <div className="report-scroll">
      <table className="report-heat" data-testid="report-heatmap">
        <thead><tr><th />{heatmap.streets.map((s) => <th key={s}>{capital(s)}</th>)}</tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p} data-testid={`report-heat-${p}`}>
              <th><LinkedText text={p} /></th>
              {heatmap.streets.map((s) => {
                const c = heatmap.cells.find((cell) => cell.position === p && cell.street === s);
                if (!c) return <td key={s} className="heat-empty">—</td>;
                const rate = c.mistakes / c.decisions;
                return (
                  <td key={s} style={{ background: heatColour(rate) }} title={t("report.cellTitle", { m: c.mistakes, d: c.decisions })}>
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
  const t = useT();
  if (leaks.length === 0) return <p className="note" data-testid="report-no-leaks">{t("report.noLeaks")}</p>;
  return (
    <ol className="report-leaks">
      {leaks.map((l, i) => (
        <li key={leakText(l)} data-testid={`report-leak-${i + 1}`}>
          <span className="leak-text"><LinkedText text={leakText(l, t)} /></span>
          <span className="leak-count">{t(l.count === 1 ? "report.times.one" : "report.times.other", { n: l.count })}</span>
          <span className="leak-hands">
            {l.hands.map((h) => (
              <Link key={`${h.tableId}-${h.handNumber}`} to={historyLink(h.tableId, h.handNumber)}>
                {labels.has(h.tableId) ? `${t("hh.table", { label: labels.get(h.tableId) ?? "" })} ` : ""}#{h.handNumber}
              </Link>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function MistakeTypes({ types }: { types: Report["mistakeTypes"] }) {
  const t = useT();
  const most = Math.max(1, ...types.map((row) => row.count));
  return (
    <div className="report-bars" data-testid="report-types">
      {types.map((row) => (
        <div className="report-bar" key={row.type} data-testid={`report-type-${row.type}`}>
          <span>{t(`report.type.${row.type}`)}</span>
          <span className="bar-track"><span className={`bar bar-${row.type}`} style={{ width: row.count ? `${Math.max(2, (row.count * 100) / most)}%` : 0 }} /></span>
          <b>{row.count}</b>
        </div>
      ))}
    </div>
  );
}

const statLabel = (key: string, t: ReturnType<typeof useT>) => {
  const label = `report.stat.${key}`;
  return label in en ? t(label as MessageKey) : key;
};

export function PlayerStats({ stats }: { stats: PlayerStat[] }) {
  const t = useT();
  return (
    <div className="report-scroll">
      <table className="data-table report-stats" data-testid="report-stats">
        <thead><tr><th>{t("report.col.stat")}</th><th>{t("hh.col.you")}</th><th>{t("report.col.range")}</th><th /></tr></thead>
        <tbody>
          {stats.map((s) => {
            const verdict = statVerdict(s, t);
            return (
              <tr key={s.key} data-testid={`report-stat-${s.key}`}>
                <td>{STAT_TERM[s.key] ? <GlossaryTerm id={STAT_TERM[s.key]}>{statLabel(s.key, t)}</GlossaryTerm> : statLabel(s.key, t)}</td>
                <td>{s.value === null ? "—" : `${localNumber(s.value)}%`}</td>
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
