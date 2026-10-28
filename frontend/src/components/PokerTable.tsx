import { Card, TableState, formatChips } from "../models/game";
import { CardView } from "./CardView";
import { PokerSeat } from "./PokerSeat";
import { useT } from "../i18n/I18n";
import { handName } from "../i18n/review";
import type { MessageKey } from "../i18n/messages/en";

interface PokerTableProps {
  state: TableState;
  children?: React.ReactNode;
  /** Optional overlay rendered over the felt (re-entry / hero-out modal). */
  overlay?: React.ReactNode;
  /** Covers the whole table area: bars, felt and controls (champion screen). */
  cover?: React.ReactNode;
  /** Right before the felt: the coach card on phones (plans 087, 089). */
  top?: React.ReactNode;
}

const TAGS: Record<string, MessageKey> = {
  fold: "tag.fold", check: "tag.check", call: "tag.call", bet: "tag.bet", raise: "tag.raise", all_in: "tag.all_in",
};

/** The 9-seat poker table: seats, community board, pot, header info. */
export function PokerTable({ state, children, overlay, cover, top }: PokerTableProps) {
  const t = useT();
  // A43: an eliminated BOT leaves the felt entirely; the hero seat stays.
  const sorted = [...state.players]
    .filter((pl) => !pl.sitsOut || pl.isHero)
    .sort((a, b) => a.seat - b.seat);
  const isReview = state.phase === "handOver" && !!state.review;
  const review = state.review ?? null;

  // last action per seat from the live action log
  const lastActionBySeat = new Map<number, string>();
  for (const a of state.actionLog ?? []) {
    lastActionBySeat.set(a.seat, TAGS[a.action] ? t(TAGS[a.action]) : a.action.toUpperCase());
  }

  const revealBySeat = new Map<number, { cards: Card[] | null; hand: string | null }>();
  for (const s of review?.showdown ?? []) {
    revealBySeat.set(s.seat, { cards: s.cards, hand: s.handName && handName(s.handName, t) });
  }
  const winners = new Set(review?.winners ?? []);
  const allIn = new Set(review?.allInSeats ?? []);
  const folded = new Set(review?.foldedSeats ?? []);

  const seatStatus = (seat: number, foldedFlag: boolean, sitsOut: boolean): "won" | "lost" | "allIn" | "folded" | null => {
    if (!isReview || sitsOut) return null;
    if (winners.has(seat)) return "won";
    if (folded.has(seat) || foldedFlag) return "folded";
    if (allIn.has(seat)) return "allIn";
    return "lost"; // reached showdown but did not win
  };

  return (
    <div className="table-wrap" data-testid="poker-table">
      <div className="table-header">
        <span className="tbl-info">
          {t("status.level", { level: state.level, sb: state.smallBlind, bb: state.bigBlind })}
        </span>
        <span className="tbl-info">
          {state.inBreak ? t("status.break") : ""}
          {state.ante > 0 ? t("status.ante", { n: formatChips(state.ante) }) : ""}
          {t("status.time", { clock: formatClock(state.secondsLeft) })}
        </span>
        <span className="tbl-info" data-testid="pot-amount">
          {t("status.pot", { n: formatChips(state.pot) })}
        </span>
      </div>
      <div className="table-status" data-testid="table-status">
        <span className="tbl-info">{t("status.hand", { n: state.handNumber })}</span>
        {state.playersRemaining !== undefined && (
          <span className="tbl-info" data-testid="players-remaining">
            {t("status.inTournament", { n: state.playersRemaining })}
            {state.inHand !== undefined ? t("status.inHand", { n: state.inHand }) : ""}
          </span>
        )}
        {state.totalChips !== undefined && (
          <span className="tbl-info" data-testid="total-chips">
            {t("status.totalChips", { n: formatChips(state.totalChips) })}
          </span>
        )}
        {state.averageStack !== undefined && (
          <span className="tbl-info" data-testid="average-stack">
            {t("status.averageStack", { n: formatChips(state.averageStack) })}
          </span>
        )}
        <span className="tbl-info">{t(isReview ? "status.handComplete" : "status.liveHand")}</span>
      </div>
      {top}
      <div className="table-felt keep-dark">
        {sorted.map((p) => {
          const reveal = revealBySeat.get(p.seat);
          return (
            <PokerSeat
              key={p.seat}
              player={p}
              active={state.currentActor === p.seat && !isReview}
              lastAction={isReview ? undefined : lastActionBySeat.get(p.seat)}
              status={seatStatus(p.seat, p.folded, p.sitsOut)}
              revealCards={isReview ? (reveal?.cards ?? null) : null}
              revealHand={isReview ? (reveal?.hand ?? null) : (p.isHero ? t("seat.you") : null)}
            />
          );
        })}
        <div className={state.communityCards.length === 0 ? "board board-is-empty" : "board"}>
          {/* no cards yet: the logo printed on the cloth (plan 090) */}
          {state.communityCards.length === 0 && (
            <img className="felt-logo" src="/Logo/logo-felt.png" alt="" aria-hidden="true" data-testid="felt-logo" />
          )}
          {state.communityCards.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>
        {overlay}
      </div>
      {children}
      {cover}
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
