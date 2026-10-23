/* The birthday calendar (plan 095): year and month are lists, a day fills the
 * typed field, and typing keeps working beside it. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/I18n";
import { BirthdayPicker } from "../src/components/BirthdayPicker";
import { ProfileForm } from "../src/components/ProfileForm";

afterEach(cleanup);

const picker = (value = "", lang: "en" | "es" = "en") => {
  const onPick = vi.fn();
  render(<I18nProvider initial={lang}><BirthdayPicker value={value} onPick={onPick} /></I18nProvider>);
  fireEvent.click(screen.getByTestId("birthday-open"));
  return onPick;
};
const choose = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const days = () => screen.getAllByTestId(/^birthday-day-/).length;

describe("BirthdayPicker", () => {
  it("lists adult birth years only, newest first, down to 1900", () => {
    picker();
    const years = Array.from((screen.getByTestId("birthday-year") as HTMLSelectElement).options, (o) => o.value);
    expect(years[0]).toBe(String(new Date().getFullYear() - 18));
    expect(years[years.length - 1]).toBe("1900");
  });

  it("picks a day from the chosen year and month, then closes", () => {
    const onPick = picker();
    choose("birthday-year", "1971");
    choose("birthday-month", "2");
    fireEvent.click(screen.getByTestId("birthday-day-2"));
    expect(onPick).toHaveBeenCalledWith("1971-02-02");
    expect(screen.queryByTestId("birthday-pop")).toBeNull();
  });

  it("knows how many days each month has", () => {
    picker("2000-02-10");
    expect(days()).toBe(29);
    choose("birthday-year", "1999");
    expect(days()).toBe(28);
    choose("birthday-month", "4");
    expect(days()).toBe(30);
  });

  it("names the months in the page language", () => {
    picker("1971-02-02", "es");
    expect(screen.getByRole("option", { name: "febrero" })).toBeInTheDocument();
  });
});

describe("the birthday field with its calendar", () => {
  it("fills the typed field from the calendar, and typing still works", () => {
    render(<I18nProvider initial="en"><ProfileForm initial={null} onSaved={() => undefined} /></I18nProvider>);
    fireEvent.click(screen.getByTestId("birthday-open"));
    choose("birthday-year", "1971");
    choose("birthday-month", "2");
    fireEvent.click(screen.getByTestId("birthday-day-2"));
    expect(screen.getByTestId("profile-birthday")).toHaveValue("02/02/1971");
    fireEvent.change(screen.getByTestId("profile-birthday"), { target: { value: "15081980" } });
    expect(screen.getByTestId("profile-birthday")).toHaveValue("15/08/1980");
  });
});
