/* The Report page (plan 078): the shape of GET /api/history/report and the
 * wording and colours drawn from it. The backend computes every number. */

export type Period = "7d" | "30d" | "90d" | "all";

export const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];

type Rates = { agreement: number | null; mistakesPer100: number | null };

export type Summary = Rates & {
  tournaments: number; wins: number; top3: number; averageFinish: number | null;
  hands: number; decisions: number; previous: Rates | null;
};

export type StackPoint = { hand: number; stack: number; level: number; mistakes: number };

export type ReportTournament = {
  tableId: string; tableLabel: string; startedAt: string; endedAt: string | null;
  status: string; finishPlace: number | null; startingStack: number; hands: number;
};

export type HeatCell = { position: string; street: string; decisions: number; mistakes: number };

export type Leak = {
  position: string; street: string; heroAction: string; coachAction: string; count: number;
  hands: { tableId: string; handNumber: number }[];
};

export type PlayerStat = { key: string; hits: number; chances: number; value: number | null; low: number; high: number };

export type Report = {
  period: Period; tournament: string | null; summary: Summary;
  stack: (ReportTournament & { points: StackPoint[] }) | null;
  heatmap: { positions: string[]; streets: string[]; cells: HeatCell[] };
  leaks: Leak[];
  mistakeTypes: { type: "call" | "fold" | "allin" | "other"; count: number }[];
  stats: PlayerStat[];
  progress: (ReportTournament & Rates)[];
};

export const TYPE_LABELS = { call: "Wrong call", fold: "Wrong fold", allin: "Wrong all-in", other: "Other" };

export const STAT_LABELS: Record<string, string> = {
  vpip: "VPIP (play a hand)",
  pfr: "PFR (raise preflop)",
  threeBet: "3-bet (re-raise preflop)",
  steal: "Steal from CO, BTN or SB",
  cbet: "Continuation bet on the flop",
  wtsd: "Went to showdown",
};

/** Fewer chances than this and a percentage says little. */
export const FEW_CHANCES = 10;

export function statVerdict(s: PlayerStat): { text: string; tone: "ok" | "warn" | "muted" } {
  if (s.value === null || s.chances < FEW_CHANCES) {
    return { text: `few hands (${s.chances})`, tone: "muted" };
  }
  if (s.value < s.low) return { text: "below range", tone: "warn" };
  if (s.value > s.high) return { text: "above range", tone: "warn" };
  return { text: "in range", tone: "ok" };
}

export const leakText = (l: Leak): string =>
  `${l.position}, ${l.street}: ${l.heroAction} where the coach says ${l.coachAction}`;

/** Green at no mistakes, red from one decision in four. */
export function heatColour(rate: number): string {
  const hue = Math.round(130 * (1 - Math.min(rate / 0.25, 1)));
  return `hsl(${hue} 35% 27%)`;
}

export const chips = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

/** "▲ 6 vs previous 30 days": up is good for agreement, down for mistakes. */
export function change(now: number | null, before: number | null | undefined, period: Period,
  higherIsBetter: boolean): { text: string; good: boolean } | null {
  const days = PERIODS.find((p) => p.value === period)?.days;
  if (now === null || before === null || before === undefined || !days) return null;
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return { text: `same as previous ${days} days`, good: true };
  return { text: `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} vs previous ${days} days`, good: (diff > 0) === higherIsBetter };
}

export const historyLink = (tableId: string, hand: number): string =>
  `/history?table=${encodeURIComponent(tableId)}&hand=${hand}`;
