/* The years, months and days the birthday calendar shows (plan 095):
 * Gregorian, or Solar Hijri under Persian (plan 113, the owner, 5 Nov). Both
 * save the same Gregorian YYYY-MM-DD. */
import { fromJalali, jalaliMonthDays, toJalali } from "../i18n/jalali";
import { localeOf, type Lang } from "../i18n/lang";

export interface Calendar {
  /** Newest first. */
  years: number[];
  /** The twelve month names, in the language. */
  months: string[];
  /** One-letter day names from the first day of the week. */
  weekdays: string[];
  daysIn: (year: number, month: number) => number;
  /** The weekday column of the month's first day. */
  firstColumn: (year: number, month: number) => number;
  toIso: (year: number, month: number, day: number) => string;
  /** The year and month of a saved date; null when there is none. */
  read: (iso: string) => { year: number; month: number } | null;
  /** A year or a day in the language's digits. */
  num: (n: number) => string;
}

const MIN_AGE = 18;
const FIRST_YEAR = 1900;
const pad = (n: number) => String(n).padStart(2, "0");
const isIso = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso);
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const range = (from: number, downTo: number) => Array.from({ length: from - downTo + 1 }, (_, i) => from - i);
const monthName = (locale: string, date: Date) =>
  new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(date);
// 2024-01-01 was a Monday and 2024-01-06 a Saturday.
const weekNames = (locale: string, firstDay: number) => Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, firstDay + i))));

function gregorian(lang: Lang, newest: number): Calendar {
  const locale = localeOf(lang);
  return {
    years: range(newest, FIRST_YEAR),
    months: Array.from({ length: 12 }, (_, i) => monthName(locale, new Date(Date.UTC(2000, i, 1)))),
    weekdays: weekNames(locale, 1),
    daysIn: (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate(),
    firstColumn: (year, month) => (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7,
    toIso: (year, month, day) => `${year}-${pad(month)}-${pad(day)}`,
    read: (iso) => (isIso(iso) ? { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) } : null),
    num: String,
  };
}

const jalaliIso = (year: number, month: number, day: number) => fromJalali({ year, month, day });

function solarHijri(newest: number): Calendar {
  const locale = localeOf("fa");
  return {
    years: range(toJalali(`${newest}-12-31`).year, toJalali(`${FIRST_YEAR}-01-01`).year),
    months: Array.from({ length: 12 }, (_, i) => monthName(locale, utc(jalaliIso(1400, i + 1, 1)))),
    // the week starts on Saturday in Iran
    weekdays: weekNames(locale, 6),
    daysIn: jalaliMonthDays,
    firstColumn: (year, month) => (utc(jalaliIso(year, month, 1)).getUTCDay() + 1) % 7,
    toIso: jalaliIso,
    read: (iso) => (isIso(iso) ? toJalali(iso) : null),
    num: (n) => n.toLocaleString(locale, { useGrouping: false }),
  };
}

/** The calendar for the language; the newest year is the youngest adult's. */
export const birthdayCalendar = (lang: Lang, newest = new Date().getFullYear() - MIN_AGE): Calendar =>
  (lang === "fa" ? solarHijri(newest) : gregorian(lang, newest));
