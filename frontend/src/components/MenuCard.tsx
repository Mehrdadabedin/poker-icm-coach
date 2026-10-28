import { useNavigate } from "react-router-dom";
import { MENU_ICONS } from "./homeMenuIcons";
import { LockIcon } from "./LockIcon";
import type { Entry } from "./menuEntries";
import { usePlan } from "../services/plan";
import { openUpgrade } from "../services/upgrade";
import { useT } from "../i18n/I18n";

/** A menu card. A Pro item (plan 100) shows a closed lock to a Free player, who gets
 * the Upgrade sheet; an admin sees an open lock and the page. `onPick` replaces the link. */
export function MenuCard({ entry, big = false, onPick }: { entry: Entry; big?: boolean; onPick?: () => void }) {
  const navigate = useNavigate();
  const t = useT();
  const { pro, admin, known } = usePlan();
  const lock = entry.pro && known ? (admin ? "open" : pro ? null : "closed") : null;
  const classes = ["hm-card", big && "hm-card-big", lock === "closed" && "hm-card-locked"].filter(Boolean).join(" ");
  const pick = () => (lock === "closed" ? openUpgrade() : onPick ? onPick() : navigate(entry.to));
  return (
    <button type="button" className={classes} onClick={pick} data-testid={entry.testId}>
      <svg className="hm-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {MENU_ICONS[entry.icon]}
      </svg>
      <span className="hm-text">
        <b className="hm-title">{t(entry.title, { label: entry.label ?? "" }).trim()}</b>
        <span className="hm-desc">{t(entry.text)}</span>
      </span>
      {lock && (
        <span className={`hm-lock hm-lock-${lock}`} role="img" aria-label={t(lock === "open" ? "plans.lock.open" : "plans.lock.closed")} data-testid={`lock-${lock}`}>
          <LockIcon open={lock === "open"} />
          {lock === "open" && <span className="hm-lock-pro">{t("plans.pro")}</span>}
        </span>
      )}
    </button>
  );
}
