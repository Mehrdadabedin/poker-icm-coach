/* The languages at the foot of the landing page (plan 113; the owner, 6 Nov:
 * all four now): each in its own words and script, each switching the page. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LANG_KEY } from "../src/i18n/lang";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "";
  document.documentElement.dir = "";
});

async function landing(hash = "#/") {
  const { App } = await import("../src/App");
  window.location.hash = hash;
  render(<App />);
  return screen.getByTestId("footer-languages");
}

describe("the languages in the landing footer", () => {
  it("lists English, Español, 简体中文 and فارسی, each in its own language and direction", async () => {
    const line = await landing();
    expect(screen.getByTestId("minimal-footer")).toContainElement(line);
    expect(line).toHaveAccessibleName("Language");
    const items = within(line).getAllByRole("button");
    expect(items.map((b) => [b.textContent, b.lang, b.dir])).toEqual([
      ["English", "en", "ltr"], ["Español", "es", "ltr"], ["简体中文", "zh", "ltr"], ["فارسی", "fa", "rtl"]]);
    expect(screen.getByTestId("footer-lang-en")).toHaveAttribute("aria-pressed", "true");
  });

  it("switches the page: 简体中文 gives lang zh-Hans, فارسی right to left, and is remembered", async () => {
    await landing();
    fireEvent.click(screen.getByTestId("footer-lang-zh"));
    expect(document.documentElement).toHaveAttribute("lang", "zh-Hans");
    expect(screen.getByTestId("footer-lang-zh")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("footer-lang-fa"));
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(localStorage.getItem(LANG_KEY)).toBe("fa");
    fireEvent.click(screen.getByTestId("footer-lang-en"));
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Master tournament decisions");
  });

  it("also sits under the Terms, which share the footer", async () => {
    await landing("#/terms");
    expect(screen.getByTestId("legal-terms")).toContainElement(screen.getByTestId("footer-languages"));
  });
});
