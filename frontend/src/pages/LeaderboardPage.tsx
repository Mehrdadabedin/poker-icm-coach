import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copyright } from "../components/Copyright";
import { LeaderboardPodium } from "../components/LeaderboardPodium";
import { OwnRow, Row } from "../components/LeaderboardParts";
import { minutesAgo, weekDates } from "../components/leaderboardDates";
import { PageHeader } from "../components/PageHeader";
import { useTabBarShown } from "../hooks/useTabBarShown";
import { useI18n, useT } from "../i18n/I18n";
import { useLeaderboard, type Period } from "../services/leaderboardApi";

const PERIODS: Period[] = ["week", "all"];

/** LEADERBOARD (plan 102): the top 100 by points, this week or all time. */
export function LeaderboardPage() {
  const t = useT();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const tabBarShown = useTabBarShown();
  const [period, setPeriod] = useState<Period>("week");
  const { board, failed } = useLeaderboard(period);
  const minutes = board ? minutesAgo(board.updatedAt) : 0;
  return (
    <div className="page leaderboard-page" data-testid="leaderboard-page">
      <PageHeader hideHome={tabBarShown} />
      <div className="lb-head">
        <button type="button" className="lb-back" onClick={() => navigate("/")} aria-label={t("leaderboard.back")}>‹</button>
        <h1 className="screen-title lb-title">{t("leaderboard.title")}</h1>
        <span className="lb-top">{t("leaderboard.top")}</span>
      </div>
      <div className="lb-switch" role="radiogroup" aria-label={t("leaderboard.title")}>
        {PERIODS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={period === p} className={period === p ? "lb-tab lb-tab-on" : "lb-tab"}
            onClick={() => setPeriod(p)} data-testid={`lb-${p}`}>{t(p === "week" ? "leaderboard.week" : "leaderboard.all")}</button>
        ))}
      </div>
      {failed && <p className="lb-empty" role="alert">{t("leaderboard.error")}</p>}
      {board && (
        <>
          <p className="lb-meta">
            <span data-testid="lb-dates">{weekDates(board, lang, t)}</span>
            <span className="lb-updated"><i className="lb-dot" />{minutes < 1 ? t("leaderboard.updatedNow") : t("leaderboard.updated", { n: String(minutes) })}</span>
          </p>
          {board.rows.length === 0
            ? <p className="lb-empty" data-testid="lb-empty">{t(period === "week" ? "leaderboard.empty.week" : "leaderboard.empty.all")}</p>
            : (
              <>
                <LeaderboardPodium rows={board.rows.filter((row) => row.rank <= 3)} />
                <ol className="lb-list" data-testid="lb-list">{board.rows.filter((row) => row.rank > 3).map((row) => <Row key={row.rank} row={row} />)}</ol>
              </>
            )}
          {board.me && <OwnRow me={board.me} />}
        </>
      )}
      <Copyright />
    </div>
  );
}
