/* Hand History (plan 077): the user's saved tournaments, names for winners,
 * and the filters. Kept out of the page so the page stays a layout. */

export type HandRow = {
  handNumber: number; heroPosition: string; pot: number; winnerSeats: number[];
  seatNames?: string[]; net: number; heroDecision: string | null;
  coachRecommendation: string | null; grade: string | null; level: number; blindLevel: string;
};

export type TournamentRow = {
  tableId: string; tableLabel: string; startedAt: string | null; endedAt: string | null;
  status: string; finishPlace: number | null; hands: number;
};

export type HistoryFilters = { result: "all" | "won" | "lost"; mistakesOnly: boolean; position: string; level: string };

export const NO_FILTERS: HistoryFilters = { result: "all", mistakesOnly: false, position: "", level: "" };

const HERO_SEAT = 0;

export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "Table A · 13 Oct, 16:20 · finished 5th · 18 hands". A tournament still
 * marked active whose table is gone (a deploy or restart ended it) is
 * "unfinished"; the live one is "in progress". */
export function tournamentLabel(t: TournamentRow, liveId: string | null): string {
  const when = t.startedAt
    ? new Date(t.startedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const state = t.tableId === liveId ? "in progress"
    : t.status === "finished" ? (t.finishPlace ? `finished ${ordinal(t.finishPlace)}` : "finished")
      : t.status === "abandoned" ? "abandoned" : "unfinished";
  return [`Table ${t.tableLabel}`, when, state, `${t.hands} hand${t.hands === 1 ? "" : "s"}`]
    .filter(Boolean).join(" · ");
}

/** Winners by name: "You" for the hero, "Seat 5" for hands saved before names were. */
export function winnerNames(h: HandRow): string {
  return h.winnerSeats
    .map((s) => (s === HERO_SEAT ? "You" : h.seatNames?.[s] || `Seat ${s}`))
    .join(", ");
}

export function filterHands(hands: HandRow[], f: HistoryFilters): HandRow[] {
  return hands.filter((h) =>
    (f.result === "all" || (f.result === "won" ? h.net > 0 : h.net < 0))
    && (!f.mistakesOnly || h.grade === "SUBOPTIMAL")
    && (!f.position || h.heroPosition === f.position)
    && (!f.level || String(h.level) === f.level));
}
