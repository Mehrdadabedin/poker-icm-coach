import type { HandRow, HistoryFilters } from "../models/history";

interface Props {
  hands: HandRow[];
  filters: HistoryFilters;
  onChange: (next: HistoryFilters) => void;
}

/** Hand History filters (plan 077): result, mistakes only, position, level.
 * Positions and levels list only what the tournament has. */
export function HistoryFiltersBar({ hands, filters, onChange }: Props) {
  const positions = [...new Set(hands.map((h) => h.heroPosition).filter(Boolean))];
  const levels = [...new Set(hands.map((h) => h.level))].sort((a, b) => a - b);
  const set = (patch: Partial<HistoryFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="toolbar history-filters" role="group" aria-label="Filter hands">
      <select value={filters.result} aria-label="Result" data-testid="history-filter-result"
        onChange={(e) => set({ result: e.target.value as HistoryFilters["result"] })}>
        <option value="all">All results</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <select value={filters.position} aria-label="Position" data-testid="history-filter-position"
        onChange={(e) => set({ position: e.target.value })}>
        <option value="">All positions</option>
        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filters.level} aria-label="Level" data-testid="history-filter-level"
        onChange={(e) => set({ level: e.target.value })}>
        <option value="">All levels</option>
        {levels.map((l) => <option key={l} value={String(l)}>Level {l}</option>)}
      </select>
      <label className="history-mistakes-only">
        <input type="checkbox" checked={filters.mistakesOnly} data-testid="history-filter-mistakes"
          onChange={(e) => set({ mistakesOnly: e.target.checked })} />
        Mistakes only
      </label>
    </div>
  );
}
