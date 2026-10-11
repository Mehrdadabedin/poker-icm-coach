import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { forgetAwayTable } from "../services/tableAway";

/** Shown instead of "API ERROR: API 404" when the server no longer has the
 * table: tables live in server memory, so a deploy or restart ends them. The
 * table is forgotten so CONTINUE TABLE and BACK TO TABLE stop offering it. */
export function TableGone() {
  const navigate = useNavigate();
  useEffect(() => {
    forgetAwayTable();
  }, []);

  return (
    <div className="page" data-testid="table-gone">
      <h1 className="screen-title">TABLE ENDED</h1>
      <p className="bot-profiles-intro">This table is no longer available. Start a new practice tournament.</p>
      <div className="opponent-choice">
        <button className="btn btn-primary" onClick={() => navigate("/bot-profiles")} data-testid="table-gone-start">
          START PRACTICE
        </button>
        <button className="btn" onClick={() => navigate("/")} data-testid="table-gone-home">
          HOME
        </button>
      </div>
    </div>
  );
}
