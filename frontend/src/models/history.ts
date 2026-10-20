/* Hand History (plan 077): the user's saved tournaments, names for winners,
 * and the filters. Kept out of the page so the page stays a layout. */
import type { I18nValue } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";

type Words = Pick<I18nValue, "t" | "lang">;

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

/** A tournament still marked active whose table is gone (a deploy or restart
 * ended it) is "unfinished"; the live one is "in progress". */
export function tournamentState(t: Pick<TournamentRow, "tableId" | "status" | "finishPlace">,
  liveId: string | null, { t: tr, lang }: Words): string {
  if (t.tableId === liveId) return tr("hh.state.live");
  if (t.status === "finished") {
    if (!t.finishPlace) return tr("hh.state.finished");
    return tr("hh.state.finishedAt", { place: lang === "es" ? `${t.finishPlace}.º` : ordinal(t.finishPlace) });
  }
  return tr(t.status === "abandoned" ? "hh.state.abandoned" : "hh.state.unfinished");
}

/** "Table A · 13 Oct, 16:20 · finished 5th · 18 hands". */
export function tournamentLabel(t: TournamentRow, liveId: string | null, words: Words): string {
  const when = t.startedAt
    ? new Date(t.startedAt).toLocaleString(words.lang === "en" ? undefined : numberLocale(),
      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const hands = words.t(t.hands === 1 ? "mistakes.hands.one" : "mistakes.hands.other", { n: t.hands });
  return [words.t("hh.table", { label: t.tableLabel }), when, tournamentState(t, liveId, words), hands]
    .filter(Boolean).join(" · ");
}

/** Winners by name: "You" for the hero, "Seat 5" for hands saved before names were. */
export function winnerNames(h: HandRow, { t }: Words): string {
  return h.winnerSeats
    .map((s) => (s === HERO_SEAT ? t("hh.you") : h.seatNames?.[s] || t("showdown.seat", { n: s })))
    .join(", ");
}

export function filterHands(hands: HandRow[], f: HistoryFilters): HandRow[] {
  return hands.filter((h) =>
    (f.result === "all" || (f.result === "won" ? h.net > 0 : h.net < 0))
    && (!f.mistakesOnly || h.grade === "SUBOPTIMAL")
    && (!f.position || h.heroPosition === f.position)
    && (!f.level || String(h.level) === f.level));
}
