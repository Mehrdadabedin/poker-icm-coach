import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { LockIcon } from "./LockIcon";
import { useIsFree } from "../services/plan";
import { openUpgrade } from "../services/upgrade";
import { useTabBarShown } from "../hooks/useTabBarShown";
import { useT } from "../i18n/I18n";

/** A Pro page (plan 100): a Free player gets the header, a short message and
 * the Upgrade button, and the page never mounts, so it sends no request. */
export function ProOnly({ children }: { children: ReactNode }) {
  const t = useT();
  const tabBarShown = useTabBarShown();
  if (!useIsFree()) return <>{children}</>;
  return (
    <div className="page pro-locked-page" data-testid="pro-locked">
      <PageHeader hideHome={tabBarShown} />
      <LockIcon className="pro-locked-icon" />
      <h1 className="screen-title">{t("plans.locked.title")}</h1>
      <p className="pro-locked-text">{t("plans.locked.text")}</p>
      <button type="button" className="btn btn-primary" onClick={openUpgrade} data-testid="pro-locked-upgrade">{t("plans.locked.button")}</button>
    </div>
  );
}
