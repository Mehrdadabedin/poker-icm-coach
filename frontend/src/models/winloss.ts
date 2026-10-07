import { HandHistoryEntry, POSITIONS_9MAX } from "./game";

export function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * A18 — WIN / LOSE ANALYSIS: pure aggregation over a table owner's completed
 * hands (GET /api/game/{tableId}/hands). Win/loss follows the taxonomy the
 * result screens already use: net > 0 is a win, net < 0 is a loss, net == 0
 * (folded without risking chips, chop) is neutral and sits outside the
 * win/loss split, so win% + loss% always equals 100%. These functions never
 * touch the network or game state; they only derive numbers from records.
 */

export interface WinLossTotals {
  total: number;
  wins: number;
  losses: number;
  neutral: number;
  profit: number;
  winRate: number; // 0..1 over decisive (wins + losses) hands
  lossRate: number;
}

export interface LevelStats {
  level: number;
  blindLevel: string;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
}

export interface PositionStats {
  position: string;
  wins: number;
  losses: number;
  winRate: number; // wins / decisive hands at this position
}

export function winLossTotals(hands: readonly HandHistoryEntry[]): WinLossTotals {
  let wins = 0;
  let losses = 0;
  let neutral = 0;
  let profit = 0;
  for (const hand of hands) {
    profit += hand.net;
    if (hand.net > 0) wins += 1;
    else if (hand.net < 0) losses += 1;
    else neutral += 1;
  }
  const decisive = wins + losses;
  const winRate = decisive > 0 ? wins / decisive : 0;
  return {
    total: hands.length,
    wins,
    losses,
    neutral,
    profit,
    winRate,
    lossRate: decisive > 0 ? losses / decisive : 0,
  };
}

/** One row per blind level that has at least one decisive completed hand.
 * Levels with no completed hands, or only neutral ones, are omitted so the
 * view never shows a misleading 0% / 0% bar. */
export function blindLevelStats(hands: readonly HandHistoryEntry[]): LevelStats[] {
  const byLevel = new Map<number, { blindLevel: string; wins: number; losses: number }>();
  for (const hand of hands) {
    const entry = byLevel.get(hand.level) ?? { blindLevel: hand.blindLevel, wins: 0, losses: 0 };
    if (hand.net > 0) entry.wins += 1;
    else if (hand.net < 0) entry.losses += 1;
    byLevel.set(hand.level, entry);
  }
  const rows: LevelStats[] = [];
  for (const [level, entry] of byLevel) {
    const decisive = entry.wins + entry.losses;
    if (decisive === 0) continue;
    rows.push({
      level,
      blindLevel: entry.blindLevel,
      wins: entry.wins,
      losses: entry.losses,
      winRate: entry.wins / decisive,
      lossRate: entry.losses / decisive,
    });
  }
  rows.sort((a, b) => a.level - b.level);
  return rows;
}

/** One row per position with at least one decisive completed hand, ordered by
 * the table's canonical seat order (unknown positions come last). */
export function positionStats(hands: readonly HandHistoryEntry[]): PositionStats[] {
  const byPosition = new Map<string, { wins: number; losses: number }>();
  for (const hand of hands) {
    const position = hand.heroPosition || "?";
    const entry = byPosition.get(position) ?? { wins: 0, losses: 0 };
    if (hand.net > 0) entry.wins += 1;
    else if (hand.net < 0) entry.losses += 1;
    byPosition.set(position, entry);
  }
  const rows: PositionStats[] = [];
  for (const [position, entry] of byPosition) {
    const decisive = entry.wins + entry.losses;
    if (decisive === 0) continue;
    rows.push({ position, wins: entry.wins, losses: entry.losses, winRate: entry.wins / decisive });
  }
  const rank = new Map(POSITIONS_9MAX.map((position, index) => [position, index]));
  rows.sort((a, b) => {
    const ar = rank.get(a.position);
    const br = rank.get(b.position);
    if (ar === undefined && br === undefined) return a.position.localeCompare(b.position);
    if (ar === undefined) return 1;
    if (br === undefined) return -1;
    return ar - br;
  });
  return rows;
}
