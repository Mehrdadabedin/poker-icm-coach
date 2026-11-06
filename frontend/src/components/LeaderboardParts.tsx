import { Link } from "react-router-dom";
import { formatChips } from "../models/game";
import { useI18n, useT } from "../i18n/I18n";
import { placeOrdinal } from "../i18n/lang";
import type { LeaderboardMe, LeaderboardRow } from "../services/leaderboardApi";

export function Avatar({ row, size }: { row: LeaderboardRow; size: number }) {
  const style = { width: size, height: size };
  return row.photo
    ? <img className="lb-avatar" src={row.photo} alt="" style={style} />
    : <span className="lb-avatar lb-initial" style={{ ...style, fontSize: size * 0.42 }} aria-hidden="true">{row.initial}</span>;
}

/** "1 point" but "260 points", "1 victoria" but "3 victorias": the singular has its own words. */
export function usePlural() {
  const t = useT();
  return (name: "wins" | "played" | "points", n: number): string =>
    t(`leaderboard.${name}.${n === 1 ? "one" : "other"}` as const, { n: formatChips(n) });
}

export function Stats({ row }: { row: LeaderboardRow }) {
  const t = useT();
  const plural = usePlural();
  return <span className="lb-stats">{t("leaderboard.stats", { wins: plural("wins", row.wins), played: plural("played", row.played) })}</span>;
}

export function Row({ row }: { row: LeaderboardRow }) {
  const plural = usePlural();
  return (
    <li className="lb-row" data-testid={`lb-row-${row.rank}`}>
      <span className="lb-rank">{row.rank}</span>
      <Avatar row={row} size={36} />
      <span className="lb-who"><b className="lb-name"><bdi>{row.name}</bdi></b><Stats row={row} /></span>
      <span className="lb-points" aria-label={plural("points", row.points)}>{formatChips(row.points)}</span>
    </li>
  );
}

/** The player's own row, pinned above the tab bar. */
export function OwnRow({ me }: { me: LeaderboardMe }) {
  const t = useT();
  const { lang } = useI18n();
  if (me.state === "noProfile") {
    return (
      <div className="lb-own" data-testid="lb-own">
        <Link className="lb-own-link" to="/profile">{t("leaderboard.noProfile")}</Link>
      </div>
    );
  }
  return (
    <div className="lb-own" data-testid="lb-own">
      <span className="lb-own-rank">{placeOrdinal(lang, me.rank, false)}</span>
      <Avatar row={me} size={36} />
      <span className="lb-who"><b className="lb-name">{t("leaderboard.you", { name: me.name })}</b><Stats row={me} /></span>
      <span className="lb-own-points">{formatChips(me.points)}</span>
    </div>
  );
}
