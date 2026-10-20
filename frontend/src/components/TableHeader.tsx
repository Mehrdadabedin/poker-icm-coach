import { useCallback, useState } from "react";
import { TableState } from "../models/game";
import { BrandLogo } from "./BrandLogo";
import { MenuIcon, TableMenu } from "./TableMenu";
import { useT } from "../i18n/I18n";

interface TableHeaderProps {
  state: TableState;
  username: string | null;
  paused: boolean;
  handOver: boolean;
  isReview: boolean;
  onHome: () => void;
  onMistakes: () => void;
  onLogout: () => void;
  onTogglePause: () => void;
}

/** Top bar: app title, table label, authenticated user and the HOME / MY
 * MISTAKES / PAUSE / LOG OUT controls. HOME and MY MISTAKES step away from the
 * table, which stops its clock; PAUSE only holds the automatic next hand. On
 * phones the four controls sit behind the ☰ button (plan 089). */
export function TableHeader({ state, username, paused, handOver, isReview, onHome, onMistakes, onLogout, onTogglePause }: TableHeaderProps) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const name = username ?? state.username ?? "";
  return (
    <div className="top-bar app-header table-header" data-testid="app-header">
      <button type="button" className="header-menu-btn" aria-label={t("menu.label")} aria-expanded={menuOpen}
        aria-controls="table-menu" data-testid="menu-btn" onClick={() => setMenuOpen((open) => !open)}>
        <MenuIcon />
      </button>
      <h1 className="screen-title header-title" data-testid="app-title"><BrandLogo /></h1>
      <div className="header-right">
        {state.tableLabel && (
          <span className="tbl-label" data-testid="table-label">{t("table.label", { label: state.tableLabel })}</span>
        )}
        <span className="header-user" data-testid="header-username">{name}</span>
        <button className="btn btn-small header-btn" onClick={onHome} data-testid="home-btn">
          {t("table.home")}
        </button>
        <button className="btn btn-small header-btn" onClick={onMistakes} data-testid="mistakes-btn">
          {t("table.mistakes")}
        </button>
        <button className="btn btn-logout" onClick={onLogout} data-testid="logout-btn">
          {t("table.logout")}
        </button>
        <button
          className={`btn btn-small header-btn header-icon-btn header-pause ${paused ? "header-icon-play" : ""}`}
          onClick={onTogglePause}
          disabled={!handOver || isReview}
          title={t(paused ? "table.resumeTitle" : "table.pauseTitle")}
          aria-label={t(paused ? "table.resumeTitle" : "table.pauseTitle")}
          data-testid="pause-play"
        >
          {paused ? "▶" : "⏸"}
          <span className="header-pause-label"> {t(paused ? "table.resume" : "table.pause")}</span>
        </button>
      </div>
      {menuOpen && (
        <TableMenu username={name} paused={paused} canPause={handOver && !isReview} onHome={onHome}
          onMistakes={onMistakes} onLogout={onLogout} onTogglePause={onTogglePause} onClose={closeMenu} />
      )}
    </div>
  );
}
