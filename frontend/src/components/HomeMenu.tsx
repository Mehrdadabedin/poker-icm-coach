import { useNavigate } from "react-router-dom";
import { useAwayTable } from "../hooks/useAwayTable";

/** The signed-in home menu. It mounts only after login, so the check behind
 * CONTINUE TABLE runs with the user's token. START PRACTICE opens the 8-bot
 * lineup builder directly: there is no random-opponents step. */
export function HomeMenu({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const away = useAwayTable();

  return (
    <div className="home-menu">
      {away && (
        <button className="btn btn-primary" onClick={() => navigate(`/table/${away.tableId}`)} data-testid="continue-table">
          CONTINUE TABLE{away.label ? ` ${away.label}` : ""}
        </button>
      )}
      <button className="btn btn-primary" onClick={() => navigate("/bot-profiles")} data-testid="start-practice">
        START PRACTICE
      </button>
      <button className="btn" onClick={() => navigate("/bot-profiles")} data-testid="menu-bot-profiles">BOT PROFILES</button>
      <button className="btn" onClick={() => navigate("/ranges")}>RANGES</button>
      <button className="btn" onClick={() => navigate("/coach")}>ICM COACH</button>
      <button className="btn" onClick={() => navigate("/settings")}>TOURNAMENT SETTINGS</button>
      <button className="btn" onClick={() => navigate("/history")}>HAND HISTORY</button>
      <button className="btn" onClick={() => navigate("/statistics")}>STATISTICS</button>
      <button className="btn" onClick={() => navigate("/mistakes")} data-testid="menu-mistakes">MY MISTAKES</button>
      <button className="btn" onClick={() => navigate("/icm-calculator")} data-testid="menu-icm-calculator">ICM CALCULATOR</button>
      {isAdmin && (
        <button className="btn" onClick={() => navigate("/admin")} data-testid="menu-admin">ADMIN</button>
      )}
    </div>
  );
}
