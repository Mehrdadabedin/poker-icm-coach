import { translate, type Params } from "../i18n/translate";
import type { MessageKey } from "../i18n/messages/en";
import { formatChips, type HandReview } from "./game";

export type ResultKind = "won" | "lost" | "chop" | "none";
type T = (key: MessageKey, params?: Params) => string;
const english: T = (key, params) => translate("en", key, params);

/** The colour class of each result. It used to come from the English title, so
 * a translated title would have lost the colour (plan 093). */
export const RESULT_CLASS: Record<ResultKind, string> = {
  won: "result-you-won", lost: "result-you-lost", chop: "result-chopped", none: "result-no-change",
};

/** Hand-result headline text (HandResult and HandReview show the same
 * CHOPPED/YOU WON/YOU LOST/NO CHANGE facts, just in different layouts). */
export function reviewResultMeta(review: HandReview, t: T = english): {
  kind: ResultKind; title: string; subtitle: string; glyph: string;
} {
  const net = review.heroNet;
  const won = review.heroWon && !review.chop;
  const lost = !review.heroWon && !review.chop && net < 0;
  const kind: ResultKind = review.chop ? "chop" : review.heroWon ? "won" : net === 0 ? "none" : "lost";
  const title = t(`result.${kind}`);
  // Another player can win a pot the hero was not in (a side pot). Say who, so
  // their WON badge does not read as the hero losing (the owner's hand, 19 Oct).
  const others = review.showdown.filter((s) => s.won && !s.isHero).map((s) => s.name);
  const elsewhere = won && others.length > 0
    ? t(others.length > 1 ? "result.otherPots" : "result.otherPot", { names: others.join(t("result.and")) }) : "";
  const chips = (sign: string, n: number) => t("result.chips", { sign, n: formatChips(n) });
  const subtitle = review.chop
    ? chips(net >= 0 ? "+" : "-", Math.abs(net))
    : review.heroWon
      ? chips("+", net) + elsewhere
      : net < 0
        ? chips("-", -net)
        : t("result.foldedFree");
  const glyph = review.chop ? "⇄" : won ? "✓" : lost ? "✕" : "◼";
  return { kind, title, subtitle, glyph };
}
