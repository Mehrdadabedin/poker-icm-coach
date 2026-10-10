import { useNavigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { clearAuth, getUsername, logout } from "../services/api";
import { useAwayTable } from "../hooks/useAwayTable";

/** Top bar for every page except the table and the home menu (plan 063): logo
 * on the left; the user, BACK TO TABLE (after stepping away from one), HOME and
 * LOG OUT on the right, in the table header's style. It replaced the large
 * HOME button each page carried in its own place. */
export function PageHeader() {
  const navigate = useNavigate();
  const username = getUsername();
  const away = useAwayTable();

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; clear locally regardless
    }
    clearAuth();
    navigate("/");
  };

  return (
    <div className="top-bar app-header page-header" data-testid="page-header">
      <div className="screen-title header-title"><BrandLogo /></div>
      <div className="header-right">
        {username && <span className="header-user" data-testid="header-username">{username}</span>}
        {away && (
          <button
            className="btn btn-small header-btn header-back"
            onClick={() => navigate(`/table/${away.tableId}`)}
            data-testid="back-to-table"
          >
            BACK TO TABLE{away.label ? ` ${away.label}` : ""}
          </button>
        )}
        <button className="btn btn-small header-btn" onClick={() => navigate("/")} data-testid="home-btn">
          HOME
        </button>
        {username && (
          <button className="btn btn-logout" onClick={() => void signOut()} data-testid="logout-btn">
            LOG OUT
          </button>
        )}
      </div>
    </div>
  );
}
