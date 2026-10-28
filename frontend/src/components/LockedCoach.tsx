import { LockIcon } from "./LockIcon";
import { openUpgrade } from "../services/upgrade";
import { useT } from "../i18n/I18n";

/** Where the coach would be on a Free table (plan 100): a small locked chip. */
export function LockedCoachChip({ place }: { place: "top" | "side" }) {
  const t = useT();
  return (
    <button type="button" className={`coach-chip coach-chip-${place}`} onClick={openUpgrade} data-testid={`coach-chip-${place}`}>
      <LockIcon className="coach-chip-icon" />
      <b>{t("plans.chip.title")}</b>
      <span className="coach-chip-note">{t("plans.proOnly")}</span>
      <span className="coach-chip-unlock">{t("plans.chip.unlock")}</span>
    </button>
  );
}

/** The completed hands and the statistics of a Free table. */
export function LockedLine() {
  const t = useT();
  return (
    <button type="button" className="locked-line" onClick={openUpgrade} data-testid="locked-line">
      <LockIcon className="coach-chip-icon" />
      {t("plans.table.locked")}
    </button>
  );
}
