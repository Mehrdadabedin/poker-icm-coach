/* The words of a quiz question and its answer, in the page language (plan 110). */
import { numberLocale } from "../i18n/lang";
import type { MessageKey } from "../i18n/messages/en";
import type { Params } from "../i18n/translate";
import { formatChips } from "../models/game";
import type { Choice, Situation, Template } from "../services/quizApi";

type T = (key: MessageKey, params?: Params) => string;

const POSITIONS = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const number = (n: number) => n.toLocaleString(numberLocale(), { maximumFractionDigits: 1 });

/** The glossary entries worth opening after each kind of question. */
export const TERMS_FOR: Record<Template, string[]> = {
  push_fold: ["pushFold", "icm"],
  call_allin: ["callJam", "icm"],
  bubble: ["bubble", "icm"],
  pay_jump: ["finalTable", "icm"],
  open_position: ["openRaise", "icm"],
};

export function situationText(s: Situation, t: T): string {
  const where = POSITIONS.includes(s.position) ? t(`quiz.at.${s.position}` as MessageKey) : s.position;
  const facing = s.allInBb !== null
    ? t("quiz.facing.allin", { who: s.allInPosition ?? "", bb: number(s.allInBb) })
    : s.bigBlindStackBb != null
      ? t("quiz.facing.noneBb", { bb: number(s.bigBlindStackBb) })
      : t("quiz.facing.none");
  return t(`quiz.sit.${s.template}` as MessageKey, {
    players: s.playersLeft, paid: s.paidPlaces, where, stack: number(s.stackBb),
    sb: formatChips(s.smallBlind), bb: formatChips(s.bigBlind),
    ante: s.ante > 0 ? t("quiz.ante", { ante: formatChips(s.ante) }) : t("quiz.noAnte"), facing,
  });
}

export const choiceLabel = (choice: Choice, t: T) => t(`quiz.choice.${choice}` as MessageKey);
