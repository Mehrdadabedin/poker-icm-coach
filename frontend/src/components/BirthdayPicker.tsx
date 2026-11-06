import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18n";
import { birthdayCalendar } from "./birthdayCalendar";

/** A calendar for the birthday (plan 095): year and month are lists, so an
 * adult's birth year is one choice away instead of decades of scrolling.
 * Typing the date stays possible; this only fills the same field. Under
 * Persian it is Solar Hijri (plan 113) and still saves a Gregorian date. */
export function BirthdayPicker({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const { lang, t } = useI18n();
  const cal = useMemo(() => birthdayCalendar(lang), [lang]);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => cal.read(value)?.year ?? cal.years[12]);
  const [month, setMonth] = useState(() => cal.read(value)?.month ?? 1);
  const pick = (day: number) => {
    onPick(cal.toIso(year, month, day));
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
              {cal.years.map((y) => <option key={y} value={y}>{cal.num(y)}</option>)}
            </select>
            <select aria-label={t("profile.calendarMonth")} value={month} data-testid="birthday-month"
              onChange={(e) => setMonth(Number(e.target.value))}>
              {cal.months.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <div className="birthday-days">
            {cal.weekdays.map((name, i) => <span key={`day-name-${i}`} className="birthday-weekday" aria-hidden="true">{name}</span>)}
            {Array.from({ length: cal.firstColumn(year, month) }, (_, i) => <span key={`gap-${i}`} />)}
            {Array.from({ length: cal.daysIn(year, month) }, (_, i) => (
              <button type="button" key={i + 1} onClick={() => pick(i + 1)} data-testid={`birthday-day-${i + 1}`}
                className={value === cal.toIso(year, month, i + 1) ? "birthday-day is-picked" : "birthday-day"}>
                {cal.num(i + 1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
