import { useState } from "react";
import { SIZE_LABELS, sizingInsight, type StreetSizes } from "../models/report";

/* Bet sizes (plan 079): the hero's first bets on each street as a share of
 * the pot, one bar per size, with a line about the pattern. */
export function ReportBetSizes({ sizes }: { sizes: StreetSizes[] }) {
  const first = sizes.find((s) => s.bets > 0)?.street ?? "flop";
  const [street, setStreet] = useState<StreetSizes["street"]>(first);
  const shown = sizes.find((s) => s.street === street) ?? sizes[0];
  const most = Math.max(1, ...shown.buckets.map((b) => b.count));
  return (
    <div data-testid="report-bet-sizes">
      <div className="report-tabs" role="group" aria-label="Street">
        {sizes.map((s) => (
          <button key={s.street} type="button" aria-pressed={s.street === street}
            className={s.street === street ? "report-tab active" : "report-tab"}
            onClick={() => setStreet(s.street)} data-testid={`report-sizes-${s.street}`}>
            {s.street.charAt(0).toUpperCase() + s.street.slice(1)} ({s.bets})
          </button>
        ))}
      </div>
      <div className="size-bars">
        {shown.buckets.map((b) => {
          const share = shown.bets ? Math.round((100 * b.count) / shown.bets) : 0;
          return (
            <div className="size-col" key={b.size} data-testid={`report-size-${b.size}`}
              title={`${b.count} of ${shown.bets} bets`}>
              <b>{share}%</b>
              <span className="size-track"><span className={`size-bar size-${b.size}`} style={{ height: `${(100 * b.count) / most}%` }} /></span>
              <span className="size-label">{SIZE_LABELS[b.size]}</span>
            </div>
          );
        })}
      </div>
      <p className="report-insight" data-testid="report-sizes-insight">{sizingInsight(shown)}</p>
    </div>
  );
}
