import { formatChips, HandHistoryEntry } from "../models/game";
import { blindLevelStats, percent, positionStats, winLossTotals } from "../models/winloss";
import { useT } from "../i18n/I18n";

/**
 * A18 — win / lose statistics inside the existing right-side panel.
 * OVERALL PERFORMANCE heads the default HAND HISTORY view; the RESULTS BY
 * POSITION view holds the position and blind-level breakdowns.
 * Read-only: renders derived numbers from the table owner's completed hands.
 * All statistics come from ../models/winloss; no value here is hard-coded.
 */

const GREEN = "#81c784"; // same green as history-action-call
const RED = "#ff8f8f"; // same red as history-action-fold
const TRACK = "#2b3440";

function formatProfit(net: number): string {
  return `${net >= 0 ? "+" : "-"}${formatChips(Math.abs(net))}`;
}

/** Compact ring chart: one colored arc over a dark track, pct in 0..1. */
function Ring({ pct, color, label, size, stroke, testId }: {
  pct: number; color: string; label: string; size: number; stroke: number; testId?: string;
}) {
  const radius = size / 2 - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const arc = pct > 0 ? circumference * pct : 0;
  return (
    <div className="wl-ring" data-testid={testId}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={TRACK} strokeWidth={stroke} />
        {arc > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${arc} ${circumference}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="wl-ring-label">{label}</span>
    </div>
  );
}

function Overall({ totals }: { totals: ReturnType<typeof winLossTotals> }) {
  const t = useT();
  return (
    <section className="wl-section" data-testid="wl-overall">
      <h4 className="wl-title">{t("wl.overall")}</h4>
      <div className="wl-donut-row">
        <Ring pct={totals.winRate} color={GREEN} label={percent(totals.winRate)} size={76} stroke={10} testId="wl-win-donut" />
        <Ring pct={totals.lossRate} color={RED} label={percent(totals.lossRate)} size={76} stroke={10} testId="wl-loss-donut" />
      </div>
      <dl className="wl-metrics">
        <div className="wl-metric"><dt>{t("wl.totalHands")}</dt><dd data-testid="wl-total-hands">{totals.total}</dd></div>
        <div className="wl-metric"><dt>{t("wl.wins")}</dt><dd data-testid="wl-wins">{totals.wins}</dd></div>
        <div className="wl-metric"><dt>{t("wl.losses")}</dt><dd data-testid="wl-losses">{totals.losses}</dd></div>
        <div className="wl-metric"><dt>{t("wl.winRate")}</dt><dd data-testid="wl-win-rate">{percent(totals.winRate)}</dd></div>
        <div className="wl-metric"><dt>{t("wl.lossRate")}</dt><dd data-testid="wl-loss-rate">{percent(totals.lossRate)}</dd></div>
        <div className="wl-metric"><dt>{t("wl.profit")}</dt><dd data-testid="wl-profit">{t("wl.chips", { n: formatProfit(totals.profit) })}</dd></div>
      </dl>
    </section>
  );
}

function ByBlindLevel({ hands, currentLevel }: { hands: readonly HandHistoryEntry[]; currentLevel?: number }) {
  const t = useT();
  const rows = blindLevelStats(hands);
  if (rows.length === 0) return null;
  return (
    <section className="wl-section" data-testid="wl-blind-levels">
      <h4 className="wl-title">{t("wl.byLevel")}</h4>
      {rows.map((row) => (
        <div key={row.level} className="wl-level" data-testid={`wl-level-${row.level}`} data-current={row.level === currentLevel ? "true" : undefined}>
          <div className="wl-level-head">
            <span className="wl-level-name">
              {t("wl.level", { n: row.level })}
              {row.blindLevel ? <span className="wl-level-blinds">{t("wl.blinds", { b: row.blindLevel })}</span> : null}
              {row.level === currentLevel ? <span className="wl-level-current">{t("wl.current")}</span> : null}
            </span>
            <span className="wl-level-pct">{percent(row.winRate)} / {percent(row.lossRate)}</span>
          </div>
          <div className="wl-bar" role="img" aria-label={t("wl.levelBar", { n: row.level, w: percent(row.winRate), l: percent(row.lossRate) })}>
            <div className="wl-bar-win" style={{ width: `${row.winRate * 100}%` }} />
            <div className="wl-bar-loss" style={{ width: `${row.lossRate * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function ByPosition({ hands }: { hands: readonly HandHistoryEntry[] }) {
  const t = useT();
  const rows = positionStats(hands);
  if (rows.length === 0) return null;
  return (
    <section className="wl-section" data-testid="wl-positions">
      <h4 className="wl-title">{t("history.byPosition")}</h4>
      {rows.map((row) => (
        <div key={row.position} className="wl-position" data-testid={`wl-position-${row.position}`}>
          <Ring pct={row.winRate} color={GREEN} label={percent(row.winRate)} size={60} stroke={8} testId={`wl-position-ring-${row.position}`} />
          <div className="wl-position-meta">
            <span className="wl-position-name">{row.position || "?"}</span>
            <span className="wl-position-rate" data-testid={`wl-position-rate-${row.position}`}>{percent(row.winRate)}</span>
            <span className="wl-position-count">{row.wins} / {row.wins + row.losses}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function Placeholder({ loading }: { loading?: boolean }) {
  const t = useT();
  return loading
    ? <p className="wl-empty" data-testid="wl-loading">{t("wl.loading")}</p>
    : <p className="wl-empty" data-testid="wl-empty">{t("wl.empty")}</p>;
}

/** Top of the default HAND HISTORY view: rings and totals. */
export function OverallPerformance({ hands, loading }: { hands: readonly HandHistoryEntry[]; loading?: boolean }) {
  if (loading || hands.length === 0) return <Placeholder loading={loading} />;
  return <Overall totals={winLossTotals(hands)} />;
}

/** The RESULTS BY POSITION view: position rings, then blind levels. */
export function WinLoseAnalysis({ hands, currentLevel, loading }: {
  hands: readonly HandHistoryEntry[];
  currentLevel?: number;
  loading?: boolean;
}) {
  if (loading || hands.length === 0) return <Placeholder loading={loading} />;
  return (
    <div className="wl-analysis" data-testid="win-lose-analysis">
      <ByPosition hands={hands} />
      <ByBlindLevel hands={hands} currentLevel={currentLevel} />
    </div>
  );
}
