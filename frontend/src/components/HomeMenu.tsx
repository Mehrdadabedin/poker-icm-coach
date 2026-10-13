import { useNavigate } from "react-router-dom";
import { useAwayTable } from "../hooks/useAwayTable";
import { MENU_ICONS, type MenuIcon } from "./homeMenuIcons";

interface Entry {
  to: string;
  icon: MenuIcon;
  title: string;
  text: string;
  testId: string;
}

const GROUPS: { label: string; entries: Entry[] }[] = [
  {
    label: "STUDY",
    entries: [
      { to: "/coach", icon: "coach", title: "ICM coach", text: "Ask the coach about any hand and stack", testId: "menu-coach" },
      { to: "/ranges", icon: "ranges", title: "Ranges", text: "Baseline ranges by position and stack", testId: "menu-ranges" },
      { to: "/icm-calculator", icon: "calculator", title: "ICM calculator", text: "What each stack is worth", testId: "menu-icm-calculator" },
    ],
  },
  {
    label: "REVIEW",
    entries: [
      { to: "/mistakes", icon: "mistakes", title: "My mistakes", text: "Decisions the coach played differently", testId: "menu-mistakes" },
      { to: "/history", icon: "history", title: "Hand history", text: "Every tournament you played, hand by hand", testId: "menu-history" },
      { to: "/report", icon: "report", title: "Report", text: "Results, leaks and progress across tournaments", testId: "menu-report" },
    ],
  },
  {
    label: "SETUP",
    entries: [
      { to: "/settings", icon: "settings", title: "Tournament settings", text: "Stacks, blinds and speed for new tournaments", testId: "menu-settings" },
    ],
  },
];

const ADMIN: Entry = { to: "/admin", icon: "admin", title: "Admin", text: "Users and moderation", testId: "menu-admin" };

function MenuCard({ entry, big = false }: { entry: Entry; big?: boolean }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={big ? "hm-card hm-card-big" : "hm-card"} onClick={() => navigate(entry.to)} data-testid={entry.testId}>
      <svg className="hm-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {MENU_ICONS[entry.icon]}
      </svg>
      <span className="hm-text">
        <b className="hm-title">{entry.title}</b>
        <span className="hm-desc">{entry.text}</span>
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
  const groups = isAdmin
    ? GROUPS.map((g) => (g.label === "SETUP" ? { ...g, entries: [...g.entries, ADMIN] } : g))
    : GROUPS;

  return (
    <nav className="home-menu" aria-label="Main menu">
      <div className="hm-play">
        {away && (
          <MenuCard
            big
            entry={{
              to: `/table/${away.tableId}`,
              icon: "continue",
              title: `Continue table${away.label ? ` ${away.label}` : ""}`,
              text: "Pick up where you left off",
              testId: "continue-table",
            }}
          />
        )}
        <MenuCard
          big
          entry={{ to: "/bot-profiles", icon: "start", title: "Start practice", text: "Choose 8 bots and play a tournament", testId: "start-practice" }}
        />
      </div>
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="hm-label">{group.label}</p>
          <div className="hm-grid">
            {group.entries.map((entry) => <MenuCard key={entry.to} entry={entry} />)}
          </div>
        </section>
      ))}
    </nav>
  );
}
