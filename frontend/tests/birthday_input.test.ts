/* The birthday typed as dd/mm/yyyy (plan 095): the slashes come by
 * themselves, and only a complete, real date becomes an ISO date. */
import { describe, expect, it } from "vitest";
import { formatTyped, fromIso, toIso } from "../src/services/birthdayInput";

describe("formatTyped", () => {
  it.each([
    ["0", "0"], ["02", "02"], ["020", "02/0"], ["0202", "02/02"], ["02021", "02/02/1"],
    ["02021971", "02/02/1971"], ["020219715", "02/02/1971"], ["02/02/1971", "02/02/1971"],
    ["02-02-1971", "02/02/1971"], ["ab02cd", "02"], ["02/", "02"],
  ])("%s becomes %s", (typed, shown) => {
    expect(formatTyped(typed)).toBe(shown);
  });
});

describe("toIso and fromIso", () => {
  it.each([
    ["02/02/1971", "1971-02-02"], ["29/02/2000", "2000-02-29"],
    ["29/02/1999", null], ["31/04/1990", null], ["00/01/1990", null], ["12/13/1990", null],
    ["02/02/71", null], ["", null],
  ])("%s gives %s", (text, iso) => {
    expect(toIso(text)).toBe(iso);
  });

  it("shows a stored date the way it is typed", () => {
    expect(fromIso("1971-02-02")).toBe("02/02/1971");
    expect(fromIso("")).toBe("");
  });
});
