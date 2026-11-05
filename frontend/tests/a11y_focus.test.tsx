/* Focus goes into a panel when it opens and back to its button when it closes,
 * and the history drawer's tabs follow the ARIA tabs pattern (plan 111, PR 3). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TableHeader } from "../src/components/TableHeader";
import { sampleTableState } from "../src/sampleState";
import { setUpright, view } from "./strip_helpers";

const { request } = vi.hoisted(() => ({ request: vi.fn((_path: string) => new Promise(() => undefined)) }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

beforeEach(() => { localStorage.clear(); setUpright(true); });
afterEach(cleanup);

const noop = () => undefined;
const tab = (name: string) => screen.getByRole("tab", { name });

/** Focus a button, press Enter on it and return it. */
async function openWith(button: HTMLElement): Promise<HTMLElement> {
  button.focus();
  await userEvent.keyboard("{Enter}");
  return button;
}

describe("focus in and back", () => {
  it("the table menu", async () => {
    render(<TableHeader state={sampleTableState()} username="Alice" paused={false} handOver isReview={false}
      onHome={noop} onMistakes={noop} onLogout={noop} onTogglePause={noop} />);
    const button = await openWith(screen.getByRole("button", { name: "Menu" }));
    expect(within(screen.getByRole("navigation", { name: "Table menu" })).getByRole("button", { name: "HOME" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("table-menu")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("the history drawer", async () => {
    view();
    const chip = await openWith(screen.getByTestId("history-chip"));
    const drawer = screen.getByRole("dialog", { name: "Hand history" });
    expect(within(drawer).getByRole("tab", { name: "This hand" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("history-drawer")).toBeNull();
    expect(chip).toHaveFocus();
  });

  it("the coach sheet", async () => {
    view();
    const why = await openWith(screen.getByTestId("strip-why"));
    expect(within(screen.getByTestId("coach-sheet")).getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
    expect(why).toHaveFocus();
  });

  it("the glossary pop-up", async () => {
    view();
    const term = await openWith(within(screen.getByTestId("coach-strip")).getByRole("button", { name: "CO" }));
    expect(within(screen.getByTestId("gl-pop")).getAllByRole("link")[0]).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("gl-pop")).toBeNull();
    expect(term).toHaveFocus();
  });
});

describe("the history drawer's tabs", () => {
  it("control one tab panel named by the chosen tab", async () => {
    view();
    await openWith(screen.getByTestId("history-chip"));
    const panel = screen.getByRole("tabpanel");
    for (const each of screen.getAllByRole("tab")) expect(each).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAccessibleName("This hand");
  });

  it("move with the arrow keys, Home and End, and leave the bet size alone", async () => {
    view();
    const amount = screen.getByTestId("bet-amount");
    const before = (amount as HTMLInputElement).value;
    await openWith(screen.getByTestId("history-chip"));
    await userEvent.keyboard("{ArrowRight}");
    expect(tab("Last hands")).toHaveFocus();
    expect(tab("Last hands")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Last hands");
    await userEvent.keyboard("{End}");
    expect(tab("By position")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tab("This hand")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(tab("By position")).toHaveAttribute("aria-selected", "true");
    expect([tab("This hand"), tab("Last hands")].map((t) => t.tabIndex)).toEqual([-1, -1]);
    expect((screen.getByTestId("bet-amount") as HTMLInputElement).value).toBe(before);
  });

  it("are named in Spanish", async () => {
    view({}, {}, "es");
    await openWith(screen.getByTestId("history-chip"));
    expect(screen.getByRole("tab", { name: "Esta mano" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Últimas manos");
  });
});
