import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getUsername, logout } from "../services/api";
import { Copyright } from "./Copyright";
import { HomeBand } from "./HomeBand";
import { MenuCard } from "./MenuCard";
import { UpgradeCard } from "./UpgradeCard";
import type { Entry } from "./menuEntries";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

/** A tab's page (plan 099): the home page look, a title and the cards of one group. */
export function TabPage({ title, entries, testId, upgrade = false, children }: { title: MessageKey; entries: Entry[]; testId: string; upgrade?: boolean; children?: ReactNode }) {
  const navigate = useNavigate();
  const t = useT();
  const signOut = async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; always clear locally
    }
    clearAuth();
    navigate("/");
  };
  return (
    <div className="home-screen" data-testid={testId}>
      <HomeBand user={getUsername() ?? ""} onSignOut={() => void signOut()} />
      <main className="home-body">
        <h2 className="tab-title" data-testid="tab-title">{t(title)}</h2>
        <div className="hm-grid">
          {entries.map((entry) => <MenuCard key={entry.to} entry={entry} />)}
          {upgrade && <UpgradeCard />}
        </div>
        {children}
        <Copyright />
      </main>
    </div>
  );
}
