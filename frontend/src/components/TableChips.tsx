import { useT } from "../i18n/I18n";
import { gradeLine } from "../i18n/coach";

interface TableChipsProps {
  detailsOpen: boolean;
  onDetails: () => void;
  onHistory: () => void;
  /** Pro with the coach strip folded: the Coach chip (it shows the grade for a few seconds) */
  coachChip: { grade: Record<string, string> | null; onClick: () => void } | null;
}

/** The right end of the first status line on an upright phone (plan 101). */
export function TableChips({ detailsOpen, onDetails, onHistory, coachChip }: TableChipsProps) {
  const t = useT();
  return (
    <span className="tbl-chips">
      {coachChip && (
        <button type="button" className="tbl-chip" onClick={coachChip.onClick} title={t("strip.unfold")} data-testid="coach-chip-folded">
          {coachChip.grade ? <b className={`grade-${coachChip.grade.grade}`}>{gradeLine(coachChip.grade, t).grade}</b> : t("strip.coach")}
        </button>
      )}
      <button type="button" className="tbl-chip tbl-chip-i" aria-label={t("strip.details")} aria-expanded={detailsOpen}
        aria-controls="table-details" onClick={onDetails} data-testid="details-btn">i</button>
      <button type="button" className="tbl-chip tbl-chip-history" onClick={onHistory} data-testid="history-chip">{t("strip.history")}</button>
    </span>
  );
}
