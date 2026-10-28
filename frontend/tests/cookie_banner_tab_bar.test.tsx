/* The cookie banner clears the phone tab bar (plan 099 follow-up). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("the cookie banner on a phone", () => {
  it("is lifted above the tab bar", () => {
    const css = readFileSync("src/styles/analytics-consent.css", "utf8");
    expect(css).toMatch(/body\.has-tab-bar \.analytics-consent\s*\{\s*bottom:\s*calc\(72px \+ 16px \+ env\(safe-area-inset-bottom\)\)/);
  });
});
