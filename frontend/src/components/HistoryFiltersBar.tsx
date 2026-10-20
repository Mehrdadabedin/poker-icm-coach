import { useT } from "../i18n/I18n";
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
  const t = useT();
  const set = (patch: Partial<HistoryFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="toolbar history-filters" role="group" aria-label={t("hh.filter.label")}>
      <select value={filters.result} aria-label={t("hh.filter.result")} data-testid="history-filter-result"
        onChange={(e) => set({ result: e.target.value as HistoryFilters["result"] })}>
        <option value="all">{t("hh.filter.allResults")}</option>
        <option value="won">{t("hh.filter.won")}</option>
        <option value="lost">{t("hh.filter.lost")}</option>
      </select>
      <select value={filters.position} aria-label={t("hh.filter.position")} data-testid="history-filter-position"
        onChange={(e) => set({ position: e.target.value })}>
        <option value="">{t("hh.filter.allPositions")}</option>
        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filters.level} aria-label={t("hh.filter.level")} data-testid="history-filter-level"
        onChange={(e) => set({ level: e.target.value })}>
        <option value="">{t("hh.filter.allLevels")}</option>
        {levels.map((l) => <option key={l} value={String(l)}>{t("hh.filter.levelN", { n: l })}</option>)}
      </select>
      <label className="history-mistakes-only">
        <input type="checkbox" checked={filters.mistakesOnly} data-testid="history-filter-mistakes"
          onChange={(e) => set({ mistakesOnly: e.target.checked })} />
        {t("hh.filter.mistakes")}
      </label>
    </div>
  );
}
