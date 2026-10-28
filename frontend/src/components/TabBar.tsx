import { Link, useLocation } from "react-router-dom";
import { ProfileTabIcon } from "./ProfileTabIcon";
import { TAB_ICONS, type TabIcon } from "./tabBarIcons";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

interface Tab {
  to: string;
  id: string;
  label: MessageKey;
  icon?: TabIcon;
  /** the pages that belong under this tab, so it stays gold inside them */
  pages: string[];
}

const TABS: Tab[] = [
  { to: "/", id: "home", label: "tabs.home", icon: "home", pages: ["/", "/login", "/bot-profiles", "/leaderboard"] },
  { to: "/learn", id: "learn", label: "tabs.learn", icon: "learn", pages: ["/learn", "/coach", "/ranges", "/icm-calculator", "/glossary"] },
  { to: "/review", id: "review", label: "tabs.review", icon: "review", pages: ["/review", "/mistakes", "/history", "/report", "/statistics"] },
  { to: "/setup", id: "setup", label: "tabs.setup", icon: "setup", pages: ["/setup", "/settings", "/appearance", "/admin"] },
  { to: "/profile", id: "profile", label: "tabs.profile", pages: ["/profile", "/portrait"] },
];

export const currentTab = (pathname: string): string | undefined =>
  TABS.find((tab) => tab.pages.some((page) => pathname === page || (page !== "/" && pathname.startsWith(`${page}/`))))?.id;

/** The phone tab bar (plan 099): Home, Learn, Review, Setup, Profile. */
export function TabBar() {
  const t = useT();
  const { pathname } = useLocation();
  const current = currentTab(pathname);
  return (
    <nav className="tab-bar" aria-label={t("tabs.label")} data-testid="tab-bar">
      {TABS.map((tab) => (
        <Link key={tab.id} to={tab.to} className={tab.id === current ? "tab tab-current" : "tab"}
          aria-current={tab.id === current ? "page" : undefined} data-testid={`tab-${tab.id}`}>
          {tab.icon
            ? <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{TAB_ICONS[tab.icon]}</svg>
            : <ProfileTabIcon refreshKey={pathname === "/profile"} />}
          <span className="tab-label">{t(tab.label)}</span>
        </Link>
      ))}
    </nav>
  );
}
