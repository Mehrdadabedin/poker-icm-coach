/* Solar Hijri to Gregorian and back (plan 113): the birthday picker under
 * Persian shows Solar Hijri days and saves the Gregorian date. */
import { describe, expect, it } from "vitest";
import { fromJalali, isJalaliLeap, jalaliMonthDays, toJalali } from "../src/i18n/jalali";

const DAY_MS = 86_400_000;
// Latin digits so the parts read as numbers; the calendar is the one fa-IR uses
const persian = new Intl.DateTimeFormat("fa-IR-u-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });

describe("the Solar Hijri calendar", () => {
  it("knows the days the owner and Iran know", () => {
    expect(toJalali("2026-11-05")).toEqual({ year: 1405, month: 8, day: 14 });
    expect(toJalali("2025-03-21")).toEqual({ year: 1404, month: 1, day: 1 }); // Nowruz
    expect(toJalali("2025-03-20")).toEqual({ year: 1403, month: 12, day: 30 }); // 1403 is a leap year
    expect(fromJalali({ year: 1349, month: 11, day: 13 })).toBe("1971-02-02");
  });

  it("gives Esfand 30 days in a leap year and 29 otherwise", () => {
    expect(isJalaliLeap(1403)).toBe(true);
    expect(isJalaliLeap(1404)).toBe(false);
    expect([1, 6, 7, 11].map((m) => jalaliMonthDays(1404, m))).toEqual([31, 31, 30, 30]);
    expect(jalaliMonthDays(1403, 12)).toBe(30);
    expect(jalaliMonthDays(1404, 12)).toBe(29);
  });

  it("turns every day of the picker's years into Solar Hijri and back, agreeing with Intl", () => {
    const last = Date.UTC(new Date().getFullYear() + 1, 0, 1);
    let days = 0;
    for (let t = Date.UTC(1900, 0, 1); t < last; t += DAY_MS) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const j = toJalali(iso);
      const intl = Object.fromEntries(persian.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
      if (j.year !== Number(intl.year) || j.month !== Number(intl.month) || j.day !== Number(intl.day)) {
        expect(j, `${iso} in Intl is ${intl.year}/${intl.month}/${intl.day}`).toBe(null);
      }
      if (fromJalali(j) !== iso) expect(fromJalali(j), `${iso} back from ${j.year}/${j.month}/${j.day}`).toBe(iso);
      days += 1;
    }
    expect(days).toBeGreaterThan(46_000);
  });
});
