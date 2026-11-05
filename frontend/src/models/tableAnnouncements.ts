/* What a screen reader should hear when the table changes (plan 111). A pure
 * function of two snapshots: the same snapshot twice, or a clock tick alone,
 * says nothing. The page polls every 350 ms, so most snapshots repeat. */
import { actionWord } from "../i18n/coach";
import type { MessageKey } from "../i18n/messages/en";
import type { Params } from "../i18n/translate";
import { cardAlt, formatChips, type CoachAdvice, type TableState } from "./game";
import { reviewResultMeta } from "./handResult";

type T = (key: MessageKey, params?: Params) => string;

export interface Announcements { polite: string | null; assertive: string | null }
export interface AnnounceOptions {
  /** Advice for this street, Pro only; null for a Free player or none yet. */
  coach: CoachAdvice | null;
  /** The advice the previous snapshot was announced with. */
  prevCoach: CoachAdvice | null;
}

const NO_NEWS: Announcements = { polite: null, assertive: null };

/** More new actions than this in one poll (the hand ran on while the hero was out of it) are
 * counted, and only the last few are said. */
export const MAX_ACTIONS = 8;
const LAST_ACTIONS = 3;

function botActions(prev: TableState | null, next: TableState, t: T): string[] {
  const log = next.actionLog ?? [];
  const seen = prev && prev.handNumber === next.handNumber ? (prev.actionLog ?? []).length : 0;
  const fresh = log.slice(seen).filter((a) => a.seat !== next.heroSeat);
  const said = fresh.length > MAX_ACTIONS ? fresh.slice(-LAST_ACTIONS) : fresh;
  const sentences = said.map((a) => {
    const name = next.players.find((p) => p.seat === a.seat)?.name ?? "";
    const base = `a11y.act.${a.action}`;
    const key = a.amount ? `${base}N` : base;
    return t(key as MessageKey, { name, n: formatChips(a.amount ?? 0) });
  });
  return said.length < fresh.length ? [t("a11y.many", { n: fresh.length }), ...sentences] : sentences;
}

function newCards(prev: TableState | null, next: TableState, t: T): string[] {
  if (!prev || prev.handNumber !== next.handNumber) return [];
  const have = prev.communityCards.length;
  const board = next.communityCards;
  const label = { 3: "flop", 4: "turn", 5: "river" }[board.length];
  if (board.length <= have || !label) return [];
  const cards = board.slice(have).map((card) => cardAlt(card, t)).join(", ");
  return [t(`a11y.street.${label}` as MessageKey, { cards })];
}

const turnKey = (s: TableState) => `${s.handNumber}:${s.street}:${(s.actionLog ?? []).length}`;

function heroTurn(prev: TableState | null, next: TableState, opts: AnnounceOptions, t: T): string | null {
  if (!next.waitingForHero || next.phase === "handOver") return null;
  const coach = opts.coach ? t("a11y.coach", { action: actionWord(opts.coach.recommendedAction, t) }) : null;
  const started = !prev?.waitingForHero || turnKey(prev) !== turnKey(next);
  if (started) {
    const pot = formatChips(next.pot);
    const turn = next.toCall > 0 ? t("a11y.turn", { n: formatChips(next.toCall), pot }) : t("a11y.turnFree", { pot });
    return coach ? `${turn} ${coach}` : turn;
  }
  return coach && !opts.prevCoach ? coach : null; // the advice arrived after the turn began
}

function tableNews(prev: TableState | null, next: TableState, t: T): string[] {
  const news: string[] = [];
  if (prev && prev.level !== next.level) {
    const params = { level: next.level, sb: next.smallBlind, bb: next.bigBlind, ante: formatChips(next.ante) };
    news.push(t(next.ante > 0 ? "a11y.levelAnte" : "a11y.level", params));
  }
  if (prev && !!prev.inBreak !== !!next.inBreak) news.push(t(next.inBreak ? "a11y.break" : "a11y.breakOver"));
  const resultIsNew = !prev || prev.phase !== "handOver" || prev.handNumber !== next.handNumber;
  if (next.phase === "handOver" && next.review && resultIsNew) {
    const { title, subtitle } = reviewResultMeta(next.review, t);
    news.push(`${title}, ${subtitle}`);
  }
  return news;
}

export function announcementsFor(prev: TableState | null, next: TableState, opts: AnnounceOptions, t: T): Announcements {
  const polite = [...botActions(prev, next, t), ...newCards(prev, next, t), ...tableNews(prev, next, t)];
  const assertive = heroTurn(prev, next, opts, t);
  if (!polite.length && !assertive) return NO_NEWS;
  return { polite: polite.length ? polite.join(". ") : null, assertive };
}
