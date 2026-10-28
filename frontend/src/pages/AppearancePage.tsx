import { AppearancePicker } from "../components/AppearancePicker";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { useTabBarShown } from "../hooks/useTabBarShown";
import { useT } from "../i18n/I18n";

/** APPEARANCE (plan 103), a SETUP card of its own: the look is kept on this
 * device, so it sits apart from the tournament settings and the account. */
export function AppearancePage() {
  const t = useT();
  const tabBarShown = useTabBarShown();
  return (
    <div className="page appearance-page" data-testid="appearance-page">
      <PageHeader hideHome={tabBarShown} />
      <h1 id="appearance-title" className="screen-title">{t("home.appearance.title")}</h1>
      <AppearancePicker heading={false} />
      <Copyright />
    </div>
  );
}
