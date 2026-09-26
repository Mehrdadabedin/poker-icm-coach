import { formatChips, HandHistoryEntry } from "../models/game";
import { blindLevelStats, percent, positionStats, winLossTotals } from "../models/winloss";

/**
 * A18 — WIN / LOSE ANALYSIS view inside the existing right-side panel.
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
  return (
    <section className="wl-section" data-testid="wl-overall">
      <h4 className="wl-title">OVERALL PERFORMANCE</h4>
      <div className="wl-donut-row">
        <Ring pct={totals.winRate} color={GREEN} label={percent(totals.winRate)} size={76} stroke={10} testId="wl-win-donut" />
        <Ring pct={totals.lossRate} color={RED} label={percent(totals.lossRate)} size={76} stroke={10} testId="wl-loss-donut" />
      </div>
      <dl className="wl-metrics">
        <div className="wl-metric"><dt>Total Hands</dt><dd data-testid="wl-total-hands">{totals.total}</dd></div>
        <div className="wl-metric"><dt>Wins</dt><dd data-testid="wl-wins">{totals.wins}</dd></div>
        <div className="wl-metric"><dt>Losses</dt><dd data-testid="wl-losses">{totals.losses}</dd></div>
        <div className="wl-metric"><dt>Win Rate</dt><dd data-testid="wl-win-rate">{percent(totals.winRate)}</dd></div>
        <div className="wl-metric"><dt>Loss Rate</dt><dd data-testid="wl-loss-rate">{percent(totals.lossRate)}</dd></div>
        <div className="wl-metric"><dt>Profit / Loss</dt><dd data-testid="wl-profit">{formatProfit(totals.profit)} chips</dd></div>
      </dl>
    </section>
  );
}

function ByBlindLevel({ hands, currentLevel }: { hands: readonly HandHistoryEntry[]; currentLevel?: number }) {
  const rows = blindLevelStats(hands);
  if (rows.length === 0) return null;
  return (
    <section className="wl-section" data-testid="wl-blind-levels">
      <h4 className="wl-title">WIN / LOSE BY BLIND LEVEL</h4>
      {rows.map((row) => (
        <div key={row.level} className="wl-level" data-testid={`wl-level-${row.level}`} data-current={row.level === currentLevel ? "true" : undefined}>
          <div className="wl-level-head">
            <span className="wl-level-name">
              Level {row.level}
              {row.blindLevel ? <span className="wl-level-blinds">({row.blindLevel} blinds)</span> : null}
              {row.level === currentLevel ? <span className="wl-level-current">CURRENT</span> : null}
            </span>
            <span className="wl-level-pct">{percent(row.winRate)} / {percent(row.lossRate)}</span>
          </div>
          <div className="wl-bar" role="img" aria-label={`Level ${row.level}: ${percent(row.winRate)} wins, ${percent(row.lossRate)} losses`}>
            <div className="wl-bar-win" style={{ width: `${row.winRate * 100}%` }} />
            <div className="wl-bar-loss" style={{ width: `${row.lossRate * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function ByPosition({ hands }: { hands: readonly HandHistoryEntry[] }) {
  const rows = positionStats(hands);
  if (rows.length === 0) return null;
  return (
    <section className="wl-section" data-testid="wl-positions">
      <h4 className="wl-title">RESULTS BY POSITION</h4>
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

export function WinLoseAnalysis({ hands, currentLevel, loading }: {
  hands: readonly HandHistoryEntry[];
  currentLevel?: number;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="wl-empty" data-testid="wl-loading">Loading completed hands…</p>;
  }
  if (hands.length === 0) {
    return <p className="wl-empty" data-testid="wl-empty">No completed hands yet.</p>;
  }
  const totals = winLossTotals(hands);
  return (
    <div className="wl-analysis" data-testid="win-lose-analysis">
      <Overall totals={totals} />
      <ByBlindLevel hands={hands} currentLevel={currentLevel} />
      <ByPosition hands={hands} />
    </div>
  );
}
