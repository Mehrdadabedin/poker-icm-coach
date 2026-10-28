import { BrandLogo } from "./BrandLogo";
import { LanguageMenu } from "./LanguageMenu";
import { useT } from "../i18n/I18n";

/** The black band at the top of the signed-in home and of the tab pages (plan 066, 099). */
export function HomeBand({ user, onSignOut }: { user: string; onSignOut: () => void }) {
  const t = useT();
  return (
    <div className="home-band">
      <div className="top-bar app-header" data-testid="session-bar">
        <h1 className="screen-title header-title" data-testid="app-title"><BrandLogo /></h1>
        <div className="header-right">
          <LanguageMenu short />
          <span className="header-user">{t("menu.playingAs")} <b data-testid="session-username">{user}</b></span>
          <button className="btn btn-logout" onClick={onSignOut} data-testid="logout-btn">
            {t("table.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
