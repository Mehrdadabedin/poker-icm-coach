import { useAwayTable } from "../hooks/useAwayTable";
import { MenuCard } from "./MenuCard";
import { ADMIN, GROUPS } from "./menuEntries";
import { useT } from "../i18n/I18n";

/** The signed-in home menu (plan 066): dark cards with an icon and one line
 * each, play first, then study, review and setup. It mounts only after login,
 * so the check behind Continue table runs with the user's token. Start
 * practice opens the 8-bot lineup builder, so BOT PROFILES has no card.
 * On a phone (plan 099) only the two play cards stay: the tab bar holds the rest. */
export function HomeMenu({ isAdmin, phone = false }: { isAdmin: boolean; phone?: boolean }) {
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
      {!phone && groups.map((group) => (
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
