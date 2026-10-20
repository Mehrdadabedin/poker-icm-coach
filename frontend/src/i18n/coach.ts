/* What the coach writes on the server, in the site's language (plan 093 step 4).
 * The server sends English plus codes: a reason code and its details, the
 * action words, and factor rows whose values come from small fixed sets.
 * Anything unknown (an older server, a new sentence) shows as sent. */
import { formatChips, type CoachAdvice } from "../models/game";
import { numberLocale } from "./lang";
import { en, type MessageKey } from "./messages/en";
import { PRESSURE_KEY } from "./poker";
import type { Params } from "./translate";

type T = (key: MessageKey, params?: Params) => string;
type Advice = Pick<CoachAdvice, "reasoning" | "reasonCode" | "reasonParams">;

const known = (key: string): key is MessageKey => key in en;
const tr = (t: T, key: string, fallback: string, params?: Params) => (known(key) ? t(key, params) : fallback);

/** The coach's reason; the ICM pressure inside it is translated too. */
export function coachReason(coach: Advice, t: T): string {
  const params: Params = { ...coach.reasonParams };
  const pressure = PRESSURE_KEY[String(params.pressure ?? "")];
  if (pressure) params.pressure = t(pressure);
  return tr(t, `coach.reason.${coach.reasonCode ?? ""}`, coach.reasoning, params);
}

/** FOLD, CALL, OPEN JAM... as players of the language say them. */
export function actionWord(word: string, t: T): string {
  return tr(t, `coach.word.${word.replace("_", "-")}`, word);
}

/** The grade after the hero acted, and its sentence. */
export function gradeLine(c: Record<string, string>, t: T): { grade: string; text: string } {
  const sentence = `coach.grade.${c.grade}.text`;
  if (!known(sentence) || !c.heroAction) return { grade: c.grade, text: c.explanation };
  return {
    grade: tr(t, `coach.grade.${c.grade}`, c.grade),
    text: t(sentence, { hero: actionWord(c.heroAction, t), coach: actionWord(c.coachAction ?? "", t) }),
  };
}

const CHIPS = /^([\d,]+) chips \(([\d.]+) BB\)$/;
const EV = /^(POSITIVE EV|NEGATIVE EV|NEUTRAL) \(([+-]?)([\d,]+)\)$/;
const ICM_VS = /^(.+) vs FOLD: (POSITIVE|NEGATIVE|NEUTRAL) \(fold ([\d.]+) vs (\S+) ([\d.]+)\)$/;
const ICM_FOLD = /^FOLD \(fold equity ([\d.]+)\)$/;
const DECIMAL = /^\d+\.\d+$/;

// English keeps the server's digits: the effective stack comes ungrouped ("4490 chips")
export const chips = (text: string) => (numberLocale() === "en-US" ? text : formatChips(Number(text.replace(/,/g, ""))));
export const decimal = (text: string) => Number(text).toLocaleString(numberLocale(),
  { minimumFractionDigits: text.split(".")[1]?.length ?? 0 });

function rowValue(label: string, value: string, coach: Advice, t: T): string {
  if (label === "WHY") return coachReason(coach, t);
  if (label === "ACTION" || label === "ALTERNATIVE") return actionWord(value, t);
  if (PRESSURE_KEY[value] && (label === "ICM PRESSURE" || label === "RISK PREMIUM")) return t(PRESSURE_KEY[value]);
  if (known(`coach.value.${value}`)) return tr(t, `coach.value.${value}`, value);
  let m = CHIPS.exec(value);
  if (m) return t("coach.value.chips", { n: chips(m[1]), bb: decimal(m[2]) });
  m = EV.exec(value);
  if (m) return `${tr(t, `coach.value.${m[1]}`, m[1])} (${m[2] || "+"}${chips(m[3])})`;
  m = ICM_VS.exec(value);
  if (m) {
    return t("coach.value.icmVs", { action: actionWord(m[1], t), verdict: tr(t, `coach.value.${m[2]}`, m[2]),
      fold: decimal(m[3]), word: actionWord(m[4].toUpperCase(), t).toLowerCase(), value: decimal(m[5]) });
  }
  m = ICM_FOLD.exec(value);
  if (m) return t("coach.value.icmFold", { fold: decimal(m[1]) });
  return DECIMAL.test(value) ? decimal(value) : value;
}

/** One factor row of the coach panel: its label and its value. */
export function factorRow(label: string, value: string, coach: Advice, t: T): [string, string] {
  return [tr(t, `coach.row.${label}`, label), rowValue(label, value, coach, t)];
}
