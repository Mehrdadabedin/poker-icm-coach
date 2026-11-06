/* The birthday under Persian (plan 113, the owner, 5 Nov): Solar Hijri in the
 * calendar and the typed field, Persian digits, and the same Gregorian date
 * saved as in every other language. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/I18n";
import { BirthdayPicker } from "../src/components/BirthdayPicker";
import { ProfileForm } from "../src/components/ProfileForm";

afterEach(cleanup);

const choose = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const days = () => screen.getAllByTestId(/^birthday-day-/).length;

function picker(value: string) {
  const onPick = vi.fn();
  render(<I18nProvider initial="fa"><BirthdayPicker value={value} onPick={onPick} /></I18nProvider>);
  fireEvent.click(screen.getByTestId("birthday-open"));
  return onPick;
}

describe("the birthday calendar in Persian", () => {
  it("opens on the saved day's Solar Hijri year and month, in Persian names and digits", () => {
    picker("1971-02-02");
    expect(screen.getByTestId("birthday-year")).toHaveValue("1349");
    expect(screen.getByTestId("birthday-month")).toHaveValue("11");
    expect(screen.getByRole("option", { name: "۱۳۴۹" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "بهمن" })).toBeInTheDocument();
    expect(screen.getByTestId("birthday-day-13")).toHaveClass("is-picked");
    expect(screen.getByTestId("birthday-day-13")).toHaveTextContent("۱۳");
  });

  it("starts the week on Saturday and puts the 1st under its weekday", () => {
    picker("2025-03-21"); // 1 Farvardin 1404, a Friday
    const names = [...document.querySelectorAll(".birthday-weekday")].map((n) => n.textContent);
    expect(names[0]).toBe("ش");
    expect(document.querySelectorAll(".birthday-days > span:not(.birthday-weekday)")).toHaveLength(6);
  });

  it("knows Esfand's length in leap and common years", () => {
    picker("");
    choose("birthday-year", "1375"); // a leap year
    choose("birthday-month", "12");
    expect(days()).toBe(30);
    choose("birthday-year", "1376");
    expect(days()).toBe(29);
    choose("birthday-month", "1");
    expect(days()).toBe(31);
  });

  it("saves the Gregorian date of the Solar Hijri day picked", () => {
    const onPick = picker("1971-02-02");
    fireEvent.click(screen.getByTestId("birthday-day-14"));
    expect(onPick).toHaveBeenCalledWith("1971-02-03");
  });

  it("lists adult birth years only, newest first, down to the year 1900 began in", () => {
    picker("");
    const years = Array.from((screen.getByTestId("birthday-year") as HTMLSelectElement).options, (o) => Number(o.value));
    expect(years[0]).toBe(new Date().getFullYear() - 18 - 621);
    expect(years[years.length - 1]).toBe(1278);
  });
});

const form = () => render(<I18nProvider initial="fa"><ProfileForm initial={null} onSaved={() => undefined} /></I18nProvider>);

describe("the typed birthday in Persian", () => {
  it("takes Persian or Latin digits, year first, and shows Persian digits", () => {
    form();
    const field = screen.getByTestId("profile-birthday");
    fireEvent.change(field, { target: { value: "۱۳۴۹۱۱۱۳" } });
    expect(field).toHaveValue("۱۳۴۹/۱۱/۱۳");
    fireEvent.change(field, { target: { value: "13700512" } });
    expect(field).toHaveValue("۱۳۷۰/۰۵/۱۲");
    expect(field).toHaveAttribute("placeholder", "۱۳۷۰/۰۵/۱۲");
  });

  it("fills the field from the calendar in Solar Hijri", () => {
    form();
    fireEvent.click(screen.getByTestId("birthday-open"));
    choose("birthday-year", "1349");
    choose("birthday-month", "11");
    fireEvent.click(screen.getByTestId("birthday-day-13"));
    expect(screen.getByTestId("profile-birthday")).toHaveValue("۱۳۴۹/۱۱/۱۳");
  });

  it("opens a saved birthday in Solar Hijri", () => {
    render(<I18nProvider initial="fa"><ProfileForm onSaved={() => undefined} initial={{
      firstName: "A", lastName: "B", displayName: "ab", birthday: "1971-02-02", gender: "prefer_not_to_say", genderText: null,
    }} /></I18nProvider>);
    expect(screen.getByTestId("profile-birthday")).toHaveValue("۱۳۴۹/۱۱/۱۳");
  });
});
