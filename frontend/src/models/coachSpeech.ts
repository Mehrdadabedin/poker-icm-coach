/* What the coach says aloud (plan 112). Spoken words are not the panel's capitals:
 * some voices spell capitals letter by letter. */
import { actionWord } from "../i18n/coach";
import type { MessageKey } from "../i18n/messages/en";
import type { Params } from "../i18n/translate";
import { formatChips, type CoachAdvice, type TableState } from "./game";

type T = (key: MessageKey, params?: Params) => string;

const WORDS: Record<string, MessageKey> = {
  FOLD: "speak.fold", CHECK: "speak.check", BET: "speak.bet", RAISE: "speak.raise", "OPEN RAISE": "speak.raise",
  "3-BET": "speak.threeBet", "4-BET": "speak.fourBet",
  "OPEN JAM": "speak.allIn", RESHOVE: "speak.allIn", "ALL-IN": "speak.allIn",
};

/** The hero's decision point: the same values that make the table ask the coach again. */
export const decisionKey = (state: TableState): string =>
  `${state.handNumber}:${state.street}:${state.actionLog?.length ?? 0}`;

// The isolate marks translate() puts around a value in Persian place it on screen; a voice gets plain text.
const spoken = (text: string): string => text.replace(/[\u2068\u2069]/g, "");

export function spokenAdvice(coach: CoachAdvice, state: TableState, t: T): string {
  const word = coach.recommendedAction;
  if (word === "CALL" || word === "CALL JAM") {
    const stack = state.players.find((p) => p.isHero)?.stack ?? state.toCall;
    const amount = word === "CALL JAM" ? Math.min(state.toCall, stack) : state.toCall;
    return spoken(amount > 0 ? t("speak.call", { amount: formatChips(amount) }) : t("speak.callPlain"));
  }
  const key = WORDS[word];
  return key ? t(key) : `${actionWord(word, t).toLowerCase()}.`;
}
