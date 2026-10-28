import { formatChips } from "../models/game";
import type { LeaderboardRow } from "../services/leaderboardApi";
import { Avatar, Stats, usePlural } from "./LeaderboardParts";

const ORDER = [2, 1, 3];

/** The top 3 side by side: 2nd, 1st, 3rd. */
export function LeaderboardPodium({ rows }: { rows: LeaderboardRow[] }) {
  const plural = usePlural();
  const places = ORDER.map((rank) => rows.find((row) => row.rank === rank)).filter((row): row is LeaderboardRow => !!row);
  return (
    <ol className="lb-podium" data-testid="lb-podium">
      {places.map((row) => (
        <li key={row.rank} className={`lb-place lb-place-${row.rank}`} data-testid={`lb-podium-${row.rank}`}>
          <span className="lb-ring">
            <Avatar row={row} size={row.rank === 1 ? 64 : 56} />
            <span className="lb-badge">{row.rank}</span>
          </span>
          <b className="lb-name">{row.name}</b>
          <span className="lb-place-points" aria-label={plural("points", row.points)}>{formatChips(row.points)}</span>
          <Stats row={row} />
        </li>
      ))}
    </ol>
  );
}
