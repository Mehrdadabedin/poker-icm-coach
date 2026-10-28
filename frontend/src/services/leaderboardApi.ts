import { useEffect, useState } from "react";
import { request } from "./api";

export type Period = "week" | "all";

export interface LeaderboardRow {
  rank: number;
  name: string;
  initial: string;
  points: number;
  wins: number;
  played: number;
  photo: string | null;
}

export type LeaderboardMe = ({ state: "ranked" } & LeaderboardRow) | { state: "noProfile" };

export interface Leaderboard {
  period: Period;
  weekStart: string;
  weekEnd: string;
  updatedAt: string;
  rows: LeaderboardRow[];
  me: LeaderboardMe | null;
}

export const getLeaderboard = (period: Period): Promise<Leaderboard> =>
  request<Leaderboard>(`/api/leaderboard?period=${period}`);

/** The board for one period; `board` is null while loading and after an error. */
export function useLeaderboard(period: Period): { board: Leaderboard | null; failed: boolean } {
  const [state, setState] = useState<{ period: Period; board: Leaderboard | null; failed: boolean }>({ period, board: null, failed: false });
  useEffect(() => {
    let active = true;
    getLeaderboard(period)
      .then((board) => active && setState({ period, board, failed: !board?.rows }))
      .catch(() => active && setState({ period, board: null, failed: true }));
    return () => { active = false; };
  }, [period]);
  return state.period === period ? { board: state.failed ? null : state.board, failed: state.failed } : { board: null, failed: false };
}
