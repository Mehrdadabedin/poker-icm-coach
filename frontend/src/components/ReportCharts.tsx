import type { ReactNode } from "react";
import { useT } from "../i18n/I18n";
import { localNumber } from "../i18n/lang";
import { formatChips } from "../models/game";
import { chips, type Report } from "../models/report";

/* The Report's two line charts (plan 078). Lines are SVG stretched to the box;
 * labels and dots are HTML placed in percent, so text stays readable on a
 * phone instead of shrinking with the drawing. */

type Line = { className: string; points: [number, number][] };
type Dot = { x: number; y: number; className: string; title: string; testId?: string };

const xPct = (i: number, n: number) => (n > 1 ? (i * 100) / (n - 1) : 50);

function Plot({ max, lines, dots, ticks, bands, overlay, xLabels, label, testId }: {
  max: number; lines: Line[]; dots: Dot[]; ticks: { value: number; text: string }[];
  bands?: ReactNode; overlay?: ReactNode; xLabels: [string, string]; label: string; testId: string;
}) {
  const y = (v: number) => 100 - (v * 100) / max;
  return (
    <div className="chart" role="img" aria-label={label} data-testid={testId}>
      <div className="chart-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {bands}
          {ticks.map((t) => <line key={t.text} className="chart-grid" x1="0" x2="100" y1={y(t.value)} y2={y(t.value)}
            vectorEffect="non-scaling-stroke" />)}
          {lines.map((l) => (
            <polyline key={l.className} className={l.className} vectorEffect="non-scaling-stroke"
              points={l.points.map(([x, v]) => `${x},${y(v)}`).join(" ")} />
          ))}
        </svg>
        {overlay}
        {ticks.map((t) => <span key={t.text} className="chart-tick" style={{ top: `${y(t.value)}%` }}>{t.text}</span>)}
        {dots.map((d) => (
          <span key={`${d.className}-${d.x}`} className={`chart-dot ${d.className}`} title={d.title}
            aria-label={d.title} data-testid={d.testId} style={{ left: `${d.x}%`, top: `${y(d.y)}%` }} />
        ))}
      </div>
      <div className="chart-x"><span>{xLabels[0]}</span><span>{xLabels[1]}</span></div>
    </div>
  );
}

/** Shaded spans of consecutive hands at one blind level, edges between hands. */
function levelBands(levels: number[], xs: number[]): { level: number; from: number; to: number }[] {
  const bands: { level: number; from: number; to: number }[] = [];
  levels.forEach((level, i) => {
    const last = bands[bands.length - 1];
    if (last?.level === level) return;
    const edge = i === 0 ? 0 : (xs[i - 1] + xs[i]) / 2;
    if (last) last.to = edge;
    bands.push({ level, from: edge, to: 100 });
  });
  return bands;
}

export function StackChart({ stack }: { stack: NonNullable<Report["stack"]> }) {
  const t = useT();
  const pts = stack.points;
  const top = Math.max(...pts.map((p) => p.stack), 1);
  const start = pts[0].stack;
  const xs = pts.map((_, i) => xPct(i, pts.length));
  const bands = levelBands(pts.map((p) => p.level), xs);
  const ticks = [{ value: top, text: chips(top) }];
  if (chips(start) !== chips(top)) ticks.push({ value: start, text: chips(start) });
  return (
    <Plot max={top * 1.1} ticks={ticks} label={t("report.chart.stack", { label: stack.tableLabel })} testId="report-stack-chart"
      xLabels={[t("report.chart.start"), t("report.chart.hand", { n: pts[pts.length - 1].hand })]}
      bands={bands.map((b, i) => (
        <rect key={b.level} x={b.from} y="0" width={b.to - b.from} height="100" className={i % 2 ? "band-b" : "band-a"} />
      ))}
      overlay={bands.map((b) => <span key={b.level} className="chart-band" style={{ left: `${b.from}%` }}>{t("report.chart.band", { n: b.level })}</span>)}
      lines={[{ className: "line-stack", points: pts.map((p, i) => [xs[i], p.stack]) }]}
      dots={pts.flatMap((p, i) => (p.mistakes > 0 ? [{
        x: xs[i], y: p.stack, className: "dot-mistake", testId: "report-stack-mistake",
        title: t(p.mistakes === 1 ? "report.chart.dot.one" : "report.chart.dot.other",
          { n: p.hand, m: p.mistakes, chips: formatChips(p.stack) }),
      }] : []))} />
  );
}

export function ProgressChart({ points }: { points: Report["progress"] }) {
  const t = useT();
  const values = points.flatMap((p) => [p.agreement ?? 0, p.mistakesPer100 ?? 0]);
  const max = Math.max(100, ...values);
  const xs = points.map((_, i) => xPct(i, points.length));
  const series = (key: "agreement" | "mistakesPer100", className: string): [Line, Dot[]] => {
    const kept = points.flatMap((p, i) => (p[key] === null ? [] : [{ p, x: xs[i], v: p[key] ?? 0 }]));
    return [{ className: `line-${className}`, points: kept.map((k) => [k.x, k.v]) },
      kept.map((k) => ({ x: k.x, y: k.v, className: `dot-${className}`, testId: `report-progress-${className}`,
        title: t(key === "agreement" ? "report.chart.agree" : "report.chart.miss",
          { label: k.p.tableLabel, v: localNumber(k.v) }) }))];
  };
  const [agreeLine, agreeDots] = series("agreement", "agree");
  const [missLine, missDots] = series("mistakesPer100", "miss");
  return (
    <Plot max={max} ticks={[{ value: 100, text: "100" }, { value: 0, text: "0" }]}
      label={t("report.chart.progress")}
      testId="report-progress-chart" xLabels={[t("report.chart.oldest"), t("report.chart.newest")]}
      lines={[agreeLine, missLine]} dots={[...agreeDots, ...missDots]} />
  );
}
