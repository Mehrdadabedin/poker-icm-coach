/* The table's ☰ menu on phones (plan 089): HOME, MY MISTAKES, PAUSE and LOG
 * OUT took a second header row held upright and a third of the width sideways. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { TableHeader } from "../src/components/TableHeader";
import { sampleTableState } from "../src/sampleState";

function header(handOver = true) {
  const on = { onHome: vi.fn(), onMistakes: vi.fn(), onLogout: vi.fn(), onTogglePause: vi.fn() };
  render(<TableHeader state={sampleTableState()} username="Alice" paused={false} handOver={handOver}
    isReview={false} {...on} />);
  return on;
}

const open = () => fireEvent.click(screen.getByTestId("menu-btn"));

describe("the table menu", () => {
  it("opens from the ☰ button with the four controls and who is playing", () => {
    header();
    const button = screen.getByTestId("menu-btn");
    expect(button).toHaveAttribute("aria-label", "Menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("table-menu")).toBeNull();
    open();
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByTestId("table-menu");
    expect(menu).toHaveTextContent("Playing as Alice");
    expect([...menu.querySelectorAll("button")].map((b) => b.textContent))
      .toEqual(["HOME", "MY MISTAKES", "PAUSE NEXT HAND", "LOG OUT"]);
  });

  it.each([
    ["menu-home", "onHome"], ["menu-mistakes", "onMistakes"],
    ["menu-pause", "onTogglePause"], ["menu-logout", "onLogout"],
  ] as const)("%s runs its action and closes the menu", (item, handler) => {
    const on = header();
    open();
    fireEvent.click(screen.getByTestId(item));
    expect(on[handler]).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("table-menu")).toBeNull();
  });

  it("closes on a tap outside it or on Escape, without acting", () => {
    const on = header();
    open();
    fireEvent.click(screen.getByTestId("table-menu-backdrop"));
    expect(screen.queryByTestId("table-menu")).toBeNull();
    open();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("table-menu")).toBeNull();
    expect(Object.values(on).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("offers pause only between hands, like the header button", () => {
    header(false);
    open();
    expect(screen.getByTestId("menu-pause")).toBeDisabled();
    expect(screen.getByTestId("pause-play")).toBeDisabled();
  });

  it("replaces the header buttons on phones only, and only on the table", () => {
    const css = readFileSync("src/styles/table-menu.css", "utf8");
    expect(css).toMatch(/^\.header-menu-btn,\n\.table-menu,\n\.table-menu-backdrop \{ display: none; \}/m);
    const phone = css.slice(css.indexOf("@media (max-width: 959px)"));
    expect(phone).toMatch(/\.app-header\.table-header \.header-menu-btn \{\s*display: grid;/);
    // scoped to the table header: the home screen keeps its own LOG OUT
    expect(phone).toContain(".app-header.table-header .header-right > button { display: none; }");
  });
});
