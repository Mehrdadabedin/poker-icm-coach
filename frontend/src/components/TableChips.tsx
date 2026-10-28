import { MENU_ICONS } from "./homeMenuIcons";
import { useT } from "../i18n/I18n";
import { gradeLine } from "../i18n/coach";

interface TableChipsProps {
  detailsOpen: boolean;
  historyOpen: boolean;
  onDetails: () => void;
  onHistory: () => void;
  /** Pro with the coach strip folded: the Coach button (a ring in the grade's colour shows the grade for a few seconds) */
  coachChip: { grade: Record<string, string> | null; onClick: () => void } | null;
}

const Icon = ({ name }: { name: "coach" | "history" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{MENU_ICONS[name]}</svg>
);

/** The right end of the first status line (plan 101; on wide screens too, plan 106): round icon buttons,
 * so LEVEL, TIME and POT keep their row at 360 px. */
export function TableChips({ detailsOpen, historyOpen, onDetails, onHistory, coachChip }: TableChipsProps) {
  const t = useT();
  return (
    <span className="tbl-chips">
      {coachChip && (
        <button type="button" className={coachChip.grade ? `tbl-chip tbl-chip-grade-${coachChip.grade.grade}` : "tbl-chip"}
          aria-label={t("strip.coachLabel")} title={t("strip.unfold")} onClick={coachChip.onClick} data-testid="coach-chip-folded">
          <Icon name="coach" />
          {coachChip.grade && <b className="sr-only">{gradeLine(coachChip.grade, t).grade}</b>}
        </button>
      )}
      <button type="button" className="tbl-chip tbl-chip-i" aria-label={t("strip.details")} aria-expanded={detailsOpen}
        aria-controls="table-details" onClick={onDetails} data-testid="details-btn">i</button>
      <button type="button" className="tbl-chip" aria-label={t("strip.historyLabel")} aria-expanded={historyOpen} onClick={onHistory} data-testid="history-chip">
        <Icon name="history" />
      </button>
    </span>
  );
}
