import { useNavigate } from "react-router-dom";
import { useAwayTable } from "../hooks/useAwayTable";
import { MENU_ICONS, type MenuIcon } from "./homeMenuIcons";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

interface Entry {
  to: string;
  icon: MenuIcon;
  title: MessageKey;
  text: MessageKey;
  testId: string;
  /** filled into the title, as the table label in "Continue table D" */
  label?: string;
}

const GROUPS: { label: MessageKey; entries: Entry[] }[] = [
  {
    label: "home.study",
    entries: [
      { to: "/coach", icon: "coach", title: "home.coach.title", text: "home.coach.text", testId: "menu-coach" },
      { to: "/ranges", icon: "ranges", title: "home.ranges.title", text: "home.ranges.text", testId: "menu-ranges" },
      { to: "/icm-calculator", icon: "calculator", title: "home.calculator.title", text: "home.calculator.text", testId: "menu-icm-calculator" },
    ],
  },
  {
    label: "home.review",
    entries: [
      { to: "/mistakes", icon: "mistakes", title: "home.mistakes.title", text: "home.mistakes.text", testId: "menu-mistakes" },
      { to: "/history", icon: "history", title: "home.history.title", text: "home.history.text", testId: "menu-history" },
      { to: "/report", icon: "report", title: "home.report.title", text: "home.report.text", testId: "menu-report" },
    ],
  },
  {
    label: "home.setup",
    entries: [
      { to: "/settings", icon: "settings", title: "home.settings.title", text: "home.settings.text", testId: "menu-settings" },
      { to: "/portrait", icon: "portrait", title: "home.portrait.title", text: "home.portrait.text", testId: "menu-portrait" },
    ],
  },
];

const ADMIN: Entry = { to: "/admin", icon: "admin", title: "home.admin.title", text: "home.admin.text", testId: "menu-admin" };

function MenuCard({ entry, big = false }: { entry: Entry; big?: boolean }) {
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

/** The signed-in home menu (plan 066): dark cards with an icon and one line
 * each, play first, then study, review and setup. It mounts only after login,
 * so the check behind Continue table runs with the user's token. Start
 * practice opens the 8-bot lineup builder, so BOT PROFILES has no card. */
export function HomeMenu({ isAdmin }: { isAdmin: boolean }) {
  const away = useAwayTable();
  const t = useT();
  const groups = isAdmin
    ? GROUPS.map((g) => (g.label === "home.setup" ? { ...g, entries: [...g.entries, ADMIN] } : g))
    : GROUPS;

  return (
    <nav className="home-menu" aria-label={t("home.menu")}>
      <div className="hm-play">
        {away && (
          <MenuCard
            big
            entry={{
              to: `/table/${away.tableId}`,
              icon: "continue",
              title: "home.continue.title",
              label: away.label ?? "",
              text: "home.continue.text",
              testId: "continue-table",
            }}
          />
        )}
        <MenuCard
          big
          entry={{ to: "/bot-profiles", icon: "start", title: "home.start.title", text: "home.start.text", testId: "start-practice" }}
        />
      </div>
      {groups.map((group) => (
        <section key={group.label} aria-label={t(group.label)}>
          <p className="hm-label">{t(group.label)}</p>
          <div className="hm-grid">
            {group.entries.map((entry) => <MenuCard key={entry.to} entry={entry} />)}
          </div>
        </section>
      ))}
    </nav>
  );
}
