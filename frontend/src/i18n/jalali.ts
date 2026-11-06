/* Solar Hijri, the calendar of Iran, for the birthday picker under Persian
 * (plan 113, the owner, 5 Nov). Intl formats a date in it (fa-IR) but cannot
 * turn a Solar Hijri day back into a Gregorian one, which the picker must save.
 * The arithmetic is ICU's Persian calendar, the one Intl formats with, so the
 * two agree on every day (tests/jalali.test.ts). */

export interface JalaliDate {
  year: number;
  /** 1 (Farvardin) to 12 (Esfand). */
  month: number;
  day: number;
}

const DAY_MS = 86_400_000;
/** Days from 1 Farvardin of year 1 to 1 January 1970. */
const EPOCH_DAYS = 492_268;
/** Days before each month: six of 31, five of 30, Esfand 29 or 30. */
const MONTH_START = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];

/** Days from the epoch to 1 Farvardin of `year`; 8 leap years in every 33. */
const yearStart = (year: number): number => 365 * (year - 1) + Math.floor((8 * year + 21) / 33);

export const isJalaliLeap = (year: number): boolean => yearStart(year + 1) - yearStart(year) === 366;

export function jalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeap(year) ? 30 : 29;
}

/** A Gregorian YYYY-MM-DD as a Solar Hijri day. */
export function toJalali(iso: string): JalaliDate {
  const [y, m, d] = iso.split("-").map(Number);
  const days = Date.UTC(y, m - 1, d) / DAY_MS + EPOCH_DAYS;
  const year = 1 + Math.floor((33 * days + 3) / 12053);
  const dayOfYear = days - yearStart(year);
  const month = dayOfYear < 216 ? Math.floor(dayOfYear / 31) : Math.floor((dayOfYear - 6) / 30);
  return { year, month: month + 1, day: dayOfYear - MONTH_START[month] + 1 };
}

/** A Solar Hijri day as the Gregorian YYYY-MM-DD the profile stores. */
export function fromJalali({ year, month, day }: JalaliDate): string {
  const days = yearStart(year) + MONTH_START[month - 1] + day - 1 - EPOCH_DAYS;
  return new Date(days * DAY_MS).toISOString().slice(0, 10);
}
