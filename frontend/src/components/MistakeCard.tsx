/* One graded mistake: the hand, the decision point, and the coach's line.
 * A mistake in a hand the hero won is marked WON with a softer edge: the
 * decision was still worse than the coach's line (plan 070). */
import { actionWord, coachReason } from "../i18n/coach";
import { useT } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";
import { PRESSURE_KEY } from "../i18n/poker";
import { formatChips } from "../models/game";
import { LinkedText } from "./GlossaryTerm";

export type Decision = {
  street: string; heroAction: string; coachAction: string; grade: string;
  icmPressure: string; explanation: string; stackBb: number; toCall: number; board: string[];
  reasonCode?: string; reasonParams?: Record<string, string>; // the explanation by code (plan 093)
};

export type Mistake = {
  handNumber: number; heroCards: string[]; heroPosition: string;
  level: number; blindLevel: string; decision: Decision; won: boolean;
};

const SUITS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

/** "Ah" -> "A♥"; red suits get a class so they read as red. */
function CardFace({ card }: { card: string }) {
  const suit = card.slice(-1);
  const red = suit === "h" || suit === "d";
  return <span className={`mistake-card${red ? " mistake-card-red" : ""}`}>{card.slice(0, -1)}{SUITS[suit] ?? suit}</span>;
}

export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const d = mistake.decision;
  const t = useT();
  const pressure = PRESSURE_KEY[d.icmPressure] ? t(PRESSURE_KEY[d.icmPressure]) : d.icmPressure;
  return (
    <article className={mistake.won ? "mistake mistake-won" : "mistake"} data-testid={`mistake-${mistake.handNumber}-${d.street}`}>
      <header className="mistake-head">
        {mistake.won && <span className="mistake-won-tag">{t("mistake.won")}</span>}
        <span>{t("mistake.hand", { n: mistake.handNumber })}</span>
        <span>{t("mistake.level", { n: mistake.level, blinds: mistake.blindLevel })}</span>
        <span>{mistake.heroPosition}</span>
        <span className="mistake-street">{d.street}</span>
        <span className={`mistake-pressure mistake-pressure-${d.icmPressure.toLowerCase().replace(" ", "-")}`}>
          {t("mistake.icm", { pressure })}
        </span>
      </header>
      <div className="mistake-cards">
        {mistake.heroCards.map((c) => <CardFace key={c} card={c} />)}
        {d.board.length > 0 && <span className="mistake-board-label">{t("mistake.board")}</span>}
        {d.board.map((c) => <CardFace key={c} card={c} />)}
      </div>
      <p className="mistake-spot">
        {t("mistake.stack", { bb: d.stackBb.toLocaleString(numberLocale()) })}
        {d.toCall > 0 ? t("mistake.toCall", { n: formatChips(d.toCall) }) : ""}
      </p>
      <p className="mistake-line">
        {t("mistake.you")} <b className="mistake-you">{actionWord(d.heroAction, t)}</b>
        <span aria-hidden="true">{" → "}</span>
        {t("mistake.coach")} <b className="mistake-coach">{actionWord(d.coachAction, t)}</b>
      </p>
      <p className="mistake-why"><LinkedText text={coachReason({ reasoning: d.explanation, ...d }, t)} /></p>
    </article>
  );
}
