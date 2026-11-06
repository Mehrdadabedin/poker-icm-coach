/* The birthday typed as dd/mm/yyyy (plan 095). A phone's date picker makes a
 * player scroll back decades, so the form takes digits from the number
 * keyboard and adds the slashes itself. The API keeps ISO yyyy-mm-dd. Under
 * Persian the field is Solar Hijri, year first as written in Iran (plan 113). */
import { localDigits, parseDigits } from "../i18n/digits";
import { fromJalali, jalaliMonthDays, toJalali } from "../i18n/jalali";
import type { Lang } from "../i18n/lang";

const digitsOf = (typed: string, n: number) => parseDigits(typed).replace(/\D/g, "").slice(0, n);
const pad = (n: number) => String(n).padStart(2, "0");

/** Shape whatever was typed as dd/mm/yyyy: digits only, at most eight. */
export function formatTyped(typed: string): string {
  const d = digitsOf(typed, 8);
  return d.slice(0, 2) + (d.length > 2 ? `/${d.slice(2, 4)}` : "") + (d.length > 4 ? `/${d.slice(4)}` : "");
}

/** "02/02/1971" to "1971-02-02"; null unless it is a complete, real date. */
export function toIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/** "1971-02-02" to "02/02/1971"; empty for anything else. */
export function fromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** Shape what was typed as yyyy/mm/dd, the Solar Hijri order. */
function formatJalali(typed: string): string {
  const d = digitsOf(typed, 8);
  return d.slice(0, 4) + (d.length > 4 ? `/${d.slice(4, 6)}` : "") + (d.length > 6 ? `/${d.slice(6)}` : "");
}

/** "1349/11/13" (or ۱۳۴۹/۱۱/۱۳) to "1971-02-02"; null unless it is a complete, real day. */
function jalaliToIso(text: string): string | null {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(parseDigits(text));
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const real = month >= 1 && month <= 12 && day >= 1 && day <= jalaliMonthDays(year, month);
  return real ? fromJalali({ year, month, day }) : null;
}

function isoToJalali(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const j = toJalali(iso);
  return `${j.year}/${pad(j.month)}/${pad(j.day)}`;
}

export interface BirthdayFormat {
  /** What the field shows after a keystroke. */
  format: (typed: string) => string;
  toIso: (text: string) => string | null;
  fromIso: (iso: string) => string;
}

const GREGORIAN: BirthdayFormat = { format: formatTyped, toIso, fromIso };

const SOLAR_HIJRI: BirthdayFormat = {
  format: (typed) => localDigits(formatJalali(typed), "fa"),
  toIso: jalaliToIso,
  fromIso: (iso) => localDigits(isoToJalali(iso), "fa"),
};

/** The birthday field's calendar: Solar Hijri under Persian (the owner, 5 Nov). */
export const birthdayFormat = (lang: Lang): BirthdayFormat => (lang === "fa" ? SOLAR_HIJRI : GREGORIAN);
