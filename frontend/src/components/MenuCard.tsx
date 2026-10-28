import { useNavigate } from "react-router-dom";
import { MENU_ICONS } from "./homeMenuIcons";
import type { Entry } from "./menuEntries";
import { useT } from "../i18n/I18n";

export function MenuCard({ entry, big = false }: { entry: Entry; big?: boolean }) {
  const navigate = useNavigate();
  const t = useT();
  return (
    <button type="button" className={big ? "hm-card hm-card-big" : "hm-card"} onClick={() => navigate(entry.to)} data-testid={entry.testId}>
      <svg className="hm-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {MENU_ICONS[entry.icon]}
      </svg>
      <span className="hm-text">
        <b className="hm-title">{t(entry.title, { label: entry.label ?? "" }).trim()}</b>
        <span className="hm-desc">{t(entry.text)}</span>
      </span>
    </button>
  );
}
