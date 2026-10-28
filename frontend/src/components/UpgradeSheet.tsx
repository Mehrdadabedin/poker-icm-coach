import { useEffect } from "react";
import { closeUpgrade, useUpgradeOpen } from "../services/upgrade";
import { inAndroidApp } from "../services/platform";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

const TICKS: MessageKey[] = ["plans.sheet.tick1", "plans.sheet.tick2", "plans.sheet.tick3", "plans.sheet.tick4", "plans.sheet.tick5"];

/** What Pro adds (plan 100): a bottom sheet over a dimmed page. The Coming soon
 * button does nothing until payment exists. */
export function UpgradeSheet() {
  const open = useUpgradeOpen();
  const t = useT();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeUpgrade(); };
    document.addEventListener("keydown", onKey);
    let stopped = false;
    let remove: (() => Promise<void>) | undefined;
    if (inAndroidApp()) {
      void import("@capacitor/app").then(async ({ App }) => {
        const handle = await App.addListener("backButton", () => closeUpgrade());
        if (stopped) return handle.remove();
        remove = () => handle.remove();
        return undefined;
      });
    }
    return () => {
      stopped = true;
      document.removeEventListener("keydown", onKey);
      void remove?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={closeUpgrade} data-testid="upgrade-scrim">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()} data-testid="upgrade-sheet">
        <span className="sheet-handle" aria-hidden="true" />
        <button type="button" className="sheet-close" aria-label={t("plans.sheet.close")} onClick={closeUpgrade} data-testid="upgrade-close">×</button>
        <h2 id="sheet-title" className="sheet-title">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
          {t("plans.sheet.title")}
        </h2>
        <p className="sheet-line">{t("plans.sheet.line")}</p>
        <ul className="sheet-ticks">
          {TICKS.map((key) => (
            <li key={key}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {t(key)}
            </li>
          ))}
        </ul>
        <button type="button" className="sheet-soon" aria-disabled="true" data-testid="upgrade-soon">{t("plans.sheet.soon")}</button>
        <button type="button" className="sheet-later" onClick={closeUpgrade} data-testid="upgrade-not-now">{t("plans.sheet.notNow")}</button>
      </div>
    </div>
  );
}
