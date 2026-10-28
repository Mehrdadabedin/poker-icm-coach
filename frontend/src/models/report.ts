/* The Report page (plan 078): the shape of GET /api/history/report and the
 * wording and colours drawn from it. The backend computes every number. The
 * wording takes the site's language (plan 093); without one it is English. */
import { actionWord } from "../i18n/coach";
import { localNumber } from "../i18n/lang";
import type { MessageKey } from "../i18n/messages/en";
import { translate, type Params } from "../i18n/translate";

export type T = (key: MessageKey, params?: Params) => string;
const EN: T = (key, params) => translate("en", key, params);

export type Period = "7d" | "30d" | "90d" | "all";

export const PERIODS: { value: Period; days: number | null }[] = [
  { value: "7d", days: 7 }, { value: "30d", days: 30 }, { value: "90d", days: 90 }, { value: "all", days: null },
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
  betSizes?: StreetSizes[];  // optional: a backend from before plan 079 has none
};

export type SizeKey = "under25" | "third" | "half" | "twoThirds" | "pot" | "over";
export type StreetSizes = { street: "flop" | "turn" | "river"; bets: number; buckets: { size: SizeKey; count: number }[] };

/** Fewer chances than this and a percentage says little. */
export const FEW_CHANCES = 10;

export function statVerdict(s: PlayerStat, t: T = EN): { text: string; tone: "ok" | "warn" | "muted" } {
  if (s.value === null || s.chances < FEW_CHANCES) {
    return { text: t("report.verdict.few", { n: s.chances }), tone: "muted" };
  }
  if (s.value < s.low) return { text: t("report.verdict.below"), tone: "warn" };
  if (s.value > s.high) return { text: t("report.verdict.above"), tone: "warn" };
  return { text: t("report.verdict.in"), tone: "ok" };
}

export const leakText = (l: Leak, t: T = EN): string => t("report.leak", {
  pos: l.position, street: l.street, hero: actionWord(l.heroAction, t), coach: actionWord(l.coachAction, t) });

/** Green at no mistakes, red from one decision in four. The lightness is a token:
 * dark cells in the dark theme, pale cells in the light one. */
export function heatColour(rate: number): string {
  const hue = Math.round(130 * (1 - Math.min(rate / 0.25, 1)));
  return `hsl(${hue} 35% var(--heat-lightness))`;
}

export const chips = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

/** "▲ 6 vs previous 30 days": up is good for agreement, down for mistakes. */
export function change(now: number | null, before: number | null | undefined, period: Period,
  higherIsBetter: boolean, t: T = EN): { text: string; good: boolean } | null {
  const days = PERIODS.find((p) => p.value === period)?.days;
  if (now === null || before === null || before === undefined || !days) return null;
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return { text: t("report.same", { days }), good: true };
  return { text: t("report.change", { arrow: diff > 0 ? "▲" : "▼", diff: localNumber(Math.abs(diff)), days }),
    good: (diff > 0) === higherIsBetter };
}

export const historyLink = (tableId: string, hand: number): string =>
  `/history?table=${encodeURIComponent(tableId)}&hand=${hand}`;

/** One line about the sizes on a street, or a note when there are too few. */
export function sizingInsight(s: StreetSizes, t: T = EN): string {
  const street = s.street;
  if (s.bets < FEW_CHANCES) return t(s.bets === 1 ? "report.insight.few.one" : "report.insight.few.other", { n: s.bets, street });
  const share = (k: SizeKey) => (s.buckets.find((b) => b.size === k)?.count ?? 0) / s.bets;
  if (share("under25") >= 0.4) return t("report.insight.small", { street });
  if (share("over") >= 0.4) return t("report.insight.over", { street });
  const top = s.buckets.reduce((a, b) => (b.count > a.count ? b : a));
  return t("report.insight.common", { street, phrase: t(`report.phrase.${top.size}`),
    pct: Math.round((100 * top.count) / s.bets) });
}
