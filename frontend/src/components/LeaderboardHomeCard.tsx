import { useNavigate } from "react-router-dom";
import { formatChips } from "../models/game";
import { useI18n, useT } from "../i18n/I18n";
import { useLeaderboard } from "../services/leaderboardApi";
import { Avatar, ordinal, usePlural } from "./LeaderboardParts";
import { weekDates } from "./leaderboardDates";

/** The Home card (plan 102): this week's top 3 and the player's own row. Hidden until the board has loaded. */
export function LeaderboardHomeCard() {
  const t = useT();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const plural = usePlural();
  const { board } = useLeaderboard("week");
  if (!board) return null;
  const top = board.rows.slice(0, 3);
  const me = board.me?.state === "ranked" ? board.me : null;
  return (
    <section className="hm-card lb-card" aria-label={t("leaderboard.title")} data-testid="leaderboard-card">
      <div className="lb-card-head">
        <svg className="hm-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8M9.5 17h5" />
        </svg>
        <b className="hm-title">{t("leaderboard.title")}</b>
        <span className="lb-card-dates">{weekDates(board, lang, t)}</span>
      </div>
      {top.length === 0 ? <p className="lb-card-empty">{t("leaderboard.empty.week")}</p> : (
        <ol className="lb-card-list">
          {top.map((row) => (
            <li key={row.rank} className="lb-card-row">
              <span className={`lb-badge lb-badge-${row.rank}`}>{row.rank}</span>
              <Avatar row={row} size={28} />
              <b className="lb-name">{row.name}</b>
              <span className="lb-points">{formatChips(row.points)}</span>
            </li>
          ))}
        </ol>
      )}
      {me && (
        <p className="lb-card-me" data-testid="leaderboard-card-me">
          <span>{t("leaderboard.you", { name: me.name })}</span>
          <span>{t("leaderboard.rankPoints", { rank: ordinal(me.rank, lang), points: plural("points", me.points) })}</span>
        </p>
      )}
      <button type="button" className="lb-card-more" onClick={() => navigate("/leaderboard")} data-testid="leaderboard-more">{t("leaderboard.seeAll")}</button>
    </section>
  );
}
