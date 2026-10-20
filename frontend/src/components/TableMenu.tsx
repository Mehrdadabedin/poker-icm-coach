import { useEffect } from "react";
import { useT } from "../i18n/I18n";

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

interface TableMenuProps {
  username: string;
  paused: boolean;
  canPause: boolean;
  onHome: () => void;
  onMistakes: () => void;
  onLogout: () => void;
  onTogglePause: () => void;
  onClose: () => void;
}

/** The table's controls behind the ☰ button on phones (plan 089). A tap on an
 * item, outside the menu, or Escape closes it. */
export function TableMenu({ username, paused, canPause, onHome, onMistakes, onLogout, onTogglePause, onClose }: TableMenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const t = useT();
  const pick = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <>
      <div className="table-menu-backdrop" onClick={onClose} data-testid="table-menu-backdrop" />
      <nav className="table-menu" id="table-menu" aria-label={t("menu.table")} data-testid="table-menu">
        {username && <p className="table-menu-user">{t("menu.playingAs")} <b>{username}</b></p>}
        <button type="button" onClick={pick(onHome)} data-testid="menu-home">{t("table.home")}</button>
        <button type="button" onClick={pick(onMistakes)} data-testid="menu-mistakes">{t("table.mistakes")}</button>
        <button type="button" onClick={pick(onTogglePause)} disabled={!canPause} data-testid="menu-pause">
          {t(paused ? "menu.resumeNext" : "menu.pauseNext")}
        </button>
        <button type="button" className="table-menu-logout" onClick={pick(onLogout)} data-testid="menu-logout">
          {t("table.logout")}
        </button>
      </nav>
    </>
  );
}
