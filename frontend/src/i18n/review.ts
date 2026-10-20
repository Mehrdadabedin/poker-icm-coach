/* Hand names and the bots' reasons in the site's language (plan 093 step 4b).
 * Hand names come in one fixed English form (backend hand_description), so
 * they are read back from it; the bots' reasons come with codes. Anything
 * unknown shows as the server sent it. */
import type { BotExplanation } from "../models/game";
import { chips, decimal } from "./coach";
import { numberLocale } from "./lang";
import { en, type MessageKey } from "./messages/en";
import type { Params } from "./translate";

type T = (key: MessageKey, params?: Params) => string;

const R = "([2-9TJQKA])";
const HAND_FORMS: [RegExp, MessageKey][] = [
  [new RegExp(`^High Card ${R}$`), "hand.highCard"],
  [new RegExp(`^Pair of ${R}s$`), "hand.pair"],
  [new RegExp(`^Two Pair, ${R}s & ${R}s$`), "hand.twoPair"],
  [new RegExp(`^Three of a Kind, ${R}s$`), "hand.trips"],
  [new RegExp(`^Straight Flush, ${R} high$`), "hand.straightFlush"],
  [new RegExp(`^Straight, ${R} high$`), "hand.straight"],
  [new RegExp(`^Flush, ${R} high$`), "hand.flush"],
  [new RegExp(`^Full House, ${R}s full of ${R}s$`), "hand.fullHouse"],
  [new RegExp(`^Four of a Kind, ${R}s$`), "hand.quads"],
  [/^Uncontested \(all others folded\)$/, "hand.uncontested"],
];

/** "Pair of Js" as players of the language say it. */
export function handName(name: string, t: T): string {
  const rank = (r: string) => (r === "T" ? t("hand.ten") : r);
  for (const [form, key] of HAND_FORMS) {
    const m = form.exec(name);
    if (m) return t(key, { r: rank(m[1] ?? ""), s: rank(m[2] ?? "") });
  }
  return name;
}

const known = (key: string): key is MessageKey => key in en;
// English keeps the server's digits ("12.5 BB", "Bet 4000")
const number = (text: string) => (numberLocale() === "en-US" ? text : decimal(text));

type Explained = Pick<BotExplanation, "reason" | "reasonCode" | "reasonParams" | "faced" | "facedCode" | "facedParams">;

/** Why the bot acted. */
export function botReason(e: Explained, t: T): string {
  const key = `bots.reason.${e.reasonCode ?? ""}`;
  if (!known(key)) return e.reason;
  const params: Params = { ...e.reasonParams };
  const pressure = `bots.pressure.${String(params.pressure ?? "").toUpperCase()}`;
  if (known(pressure)) params.pressure = t(pressure);
  if (params.bb !== undefined) params.bb = number(String(params.bb));
  return t(key, params);
}

/** The action the bot faced: "Raise to 250". */
export function botFaced(e: Explained, t: T): string {
  const key = `bots.faced.${e.facedCode ?? ""}`;
  if (!known(key)) return e.faced;
  const amount = e.facedParams?.amount;
  return t(key, amount === undefined ? {} : { amount: chips(amount) });
}
