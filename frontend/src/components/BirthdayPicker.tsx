import { useState } from "react";
import { useI18n } from "../i18n/I18n";

const MIN_AGE = 18;
const FIRST_YEAR = 1900;
const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
/** Monday-first column of the 1st of the month. */
const firstColumn = (year: number, month: number) => (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

/** A calendar for the birthday (plan 095): year and month are lists, so an
 * adult's birth year is one choice away instead of decades of scrolling.
 * Typing the date stays possible; this only fills the same field. */
export function BirthdayPicker({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const { lang, t } = useI18n();
  const newest = new Date().getFullYear() - MIN_AGE;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || newest - 12);
  const [month, setMonth] = useState(() => Number(value.slice(5, 7)) || 1);
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, i, 1))));
  // 2024-01-01 was a Monday, so these are the seven names from Monday on.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i))));
  const years = Array.from({ length: newest - FIRST_YEAR + 1 }, (_, i) => newest - i);
  const pick = (day: number) => {
    onPick(`${year}-${pad(month)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div className="birthday-picker">
      <button type="button" className="birthday-open" aria-expanded={open} aria-label={t("profile.calendar")}
        onClick={() => setOpen((was) => !was)} data-testid="birthday-open">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
      </button>
      {open && (
        <div className="birthday-pop" role="dialog" aria-label={t("profile.calendar")} data-testid="birthday-pop">
          <div className="birthday-selects">
            <select aria-label={t("profile.calendarYear")} value={year} data-testid="birthday-year"
              onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select aria-label={t("profile.calendarMonth")} value={month} data-testid="birthday-month"
              onChange={(e) => setMonth(Number(e.target.value))}>
              {months.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <div className="birthday-days">
            {weekdays.map((name, i) => <span key={`day-name-${i}`} className="birthday-weekday" aria-hidden="true">{name}</span>)}
            {Array.from({ length: firstColumn(year, month) }, (_, i) => <span key={`gap-${i}`} />)}
            {Array.from({ length: daysIn(year, month) }, (_, i) => (
              <button type="button" key={i + 1} onClick={() => pick(i + 1)} data-testid={`birthday-day-${i + 1}`}
                className={value === `${year}-${pad(month)}-${pad(i + 1)}` ? "birthday-day is-picked" : "birthday-day"}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
