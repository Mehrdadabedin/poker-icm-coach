/* The name a screen reader says for a seat (plan 111). The visible pieces it
 * repeats (position, dealer chip, big-blind part) are hidden from readers. */
import type { MessageKey } from "../i18n/messages/en";
import type { Params } from "../i18n/translate";
import { formatChips, type PlayerView } from "./game";

type T = (key: MessageKey, params?: Params) => string;

/** "Ana, hijack, 45,000 chips, 112.5 big blinds, dealer, to act, bet 2,400, last action raise, 2 cards". */
export function seatLabel(player: PlayerView, active: boolean, lastAction: string | undefined, t: T): string {
  const parts = [player.isHero ? t("a11y.seat.you") : player.name];
  if (player.position) parts.push(t(`a11y.pos.${player.position}` as MessageKey));
  if (player.sitsOut) return [...parts, t("a11y.seat.out")].join(", ");
  parts.push(t("a11y.seat.chips", { n: formatChips(player.stack) }), t("a11y.seat.bigBlinds", { n: player.stackInBB }));
  if (player.isDealer) parts.push(t("a11y.seat.dealer"));
  if (active) parts.push(t("a11y.seat.toAct"));
  if (player.folded) return [...parts, t("a11y.seat.folded")].join(", ");
  if (player.stack === 0) parts.push(t("a11y.seat.allIn"));
  if (player.bet > 0) parts.push(t("a11y.seat.bet", { n: formatChips(player.bet) }));
  if (lastAction) parts.push(t("a11y.seat.last", { action: lastAction.toLowerCase() }));
  parts.push(t("a11y.seat.cards"));
  return parts.join(", ");
}
