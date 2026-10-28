import { LockIcon } from "./LockIcon";
import { useIsFree } from "../services/plan";
import { openUpgrade } from "../services/upgrade";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

/** The Upgrade entry (plan 100): a gold-edged card, for Free players only. */
export function UpgradeCard({ title = "plans.upgrade.title", text = "plans.upgrade.text" }: { title?: MessageKey; text?: MessageKey }) {
  const t = useT();
  if (!useIsFree()) return null;
  return (
    <button type="button" className="hm-card hm-card-upgrade" onClick={openUpgrade} data-testid="upgrade-entry">
      <LockIcon className="hm-icon" />
      <span className="hm-text">
        <b className="hm-title">{t(title)}</b>
        <span className="hm-desc">{t(text)}</span>
      </span>
    </button>
  );
}
