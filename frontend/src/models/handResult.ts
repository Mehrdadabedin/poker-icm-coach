import { formatChips, type HandReview } from "./game";

/** Hand-result headline text (HandResult and HandReview show the same
 * CHOPPED/YOU WON/YOU LOST/NO CHANGE facts, just in different layouts). */
export function reviewResultMeta(review: HandReview): { title: string; subtitle: string; glyph: string } {
  const net = review.heroNet;
  const won = review.heroWon && !review.chop;
  const lost = !review.heroWon && !review.chop && net < 0;
  const title = review.chop ? "CHOPPED" : review.heroWon ? "YOU WON" : net === 0 ? "NO CHANGE" : "YOU LOST";
  // Another player can win a pot the hero was not in (a side pot). Say who, so
  // their WON badge does not read as the hero losing (the owner's hand, 19 Oct).
  const others = review.showdown.filter((s) => s.won && !s.isHero).map((s) => s.name);
  const elsewhere = won && others.length > 0
    ? ` · ${others.join(" and ")} won the other pot${others.length > 1 ? "s" : ""}` : "";
  const subtitle = review.chop
    ? `${net >= 0 ? "+" : "-"}${formatChips(Math.abs(net))} chips`
    : review.heroWon
      ? `+${formatChips(net)} chips${elsewhere}`
      : net < 0
        ? `-${formatChips(-net)} chips`
        : "You folded without risking chips";
  const glyph = review.chop ? "⇄" : won ? "✓" : lost ? "✕" : "◼";
  return { title, subtitle, glyph };
}
