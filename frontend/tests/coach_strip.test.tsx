/* The table on an upright phone (plan 101): status line, coach strip, sheet, history drawer. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { setUpright, view } from "./strip_helpers";

const { request } = vi.hoisted(() => ({ request: vi.fn((_path: string) => new Promise(() => undefined)) }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

beforeEach(() => { localStorage.clear(); setUpright(true); request.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("the second status line", () => {
  it("is hidden upright, the i button shows and hides it, and the choice survives a reload", () => {
    const first = view();
    const line = screen.getByTestId("table-status");
    const button = screen.getByTestId("details-btn");
    expect(line).toHaveAttribute("hidden");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", line.id);
    fireEvent.click(button);
    expect(line).not.toHaveAttribute("hidden");
    expect(button).toHaveAttribute("aria-expanded", "true");
    first.unmount();
    view();
    expect(screen.getByTestId("table-status")).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByTestId("details-btn"));
    expect(screen.getByTestId("table-status")).toHaveAttribute("hidden");
  });

  it("is hidden on a wide screen too, with the i button and the history chip (plan 106)", () => {
    setUpright(false);
    view();
    expect(screen.getByTestId("table-status")).toHaveAttribute("hidden");
    expect(screen.getByTestId("details-btn")).toBeInTheDocument();
    expect(screen.getByTestId("history-chip")).toBeInTheDocument();
  });
});

describe("the coach strip", () => {
  it("shows the action and the reason, and a tap opens the sheet with every factor row", () => {
    view();
    expect(screen.getByTestId("strip-action")).toHaveTextContent("RAISE");
    expect(screen.getByTestId("strip-action")).toHaveClass("act-raise");
    expect(screen.getByTestId("coach-strip")).toHaveTextContent("T9s is in the CO open range.");
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("coach-strip"));
    const sheet = screen.getByTestId("coach-sheet");
    expect(sheet.querySelectorAll(".coach-sheet-rows > div")).toHaveLength(3);
    expect(sheet).toHaveTextContent("SPR4.2");
  });

  it("opens a term's definition, not the sheet, when CO is tapped", () => {
    view();
    fireEvent.click(within(screen.getByTestId("coach-strip")).getByRole("button", { name: "CO" }));
    expect(screen.getByTestId("gl-pop")).toBeInTheDocument();
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
  });

  it.each([
    ["the close button", () => fireEvent.click(screen.getByTestId("coach-sheet-close"))],
    ["a tap outside", () => fireEvent.click(screen.getByTestId("coach-sheet-scrim"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("the sheet closes with %s", (_name, close) => {
    view();
    fireEvent.click(screen.getByTestId("strip-why"));
    expect(screen.getByTestId("coach-sheet")).toBeInTheDocument();
    close();
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
  });

  it("folds to the Coach chip and remembers it", () => {
    const first = view();
    fireEvent.click(screen.getByTestId("strip-fold"));
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    expect(screen.getByTestId("coach-chip-folded")).toHaveAttribute("aria-label", "ICM coach");
    first.unmount();
    view();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    fireEvent.click(screen.getByTestId("coach-chip-folded"));
    expect(screen.getByTestId("coach-strip")).toBeInTheDocument();
    expect(localStorage.getItem("icmbot.coachStrip")).toBe("1");
  });

  it("waits for the hero's turn with a line, and has no sheet", () => {
    view({ waitingForHero: false });
    fireEvent.click(screen.getByTestId("coach-strip"));
    expect(screen.getByTestId("coach-strip")).toHaveTextContent("waiting for your turn");
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
  });

  it("shows the grade for 3 seconds, on the chip too when folded", () => {
    vi.useFakeTimers();
    const grade = { grade: "PREFERRED", heroAction: "RAISE", coachAction: "RAISE", explanation: "ok" };
    view({ waitingForHero: false }, { comparison: grade });
    expect(screen.getByTestId("strip-grade")).toHaveTextContent("PREFERRED");
    expect(screen.queryByTestId("comparison")).toBeNull();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByTestId("strip-grade")).toBeNull();
    cleanup();
    localStorage.setItem("icmbot.coachStrip", "0");
    view({ waitingForHero: false }, { comparison: grade });
    expect(screen.getByTestId("coach-chip-folded")).toHaveTextContent("PREFERRED");
  });

  it("keeps the grade banner and the coach panel on a wide screen", () => {
    setUpright(false);
    view({ waitingForHero: false }, { comparison: { grade: "PREFERRED", explanation: "ok" } });
    expect(screen.getByTestId("comparison")).toBeInTheDocument();
    expect(screen.getByTestId("coach-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("action-history")).toBeNull();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
  });
});

describe("the history drawer", () => {
  it("is closed, and the panel under the buttons is gone upright", () => {
    view();
    expect(screen.queryByTestId("history-drawer")).toBeNull();
    expect(screen.queryByTestId("action-history")).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ["the close button", () => fireEvent.click(screen.getByTestId("history-close"))],
    ["a tap outside", () => fireEvent.click(screen.getByTestId("history-scrim"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("opens with the hand's actions and closes with %s", (_name, close) => {
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    expect(screen.getByTestId("history-drawer")).toHaveTextContent("Bot3");
    expect(screen.getByTestId("history-preflop-0")).toHaveTextContent("300");
    close();
    expect(screen.queryByTestId("history-drawer")).toBeNull();
  });

  it("has a Last hands tab that reads the completed hands", () => {
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    fireEvent.click(screen.getByTestId("drawer-tab-last"));
    expect(request).toHaveBeenCalledWith(expect.stringContaining("/hands"));
  });
});

describe("the round icon buttons", () => {
  it("have only an icon, an English label, and the grade as text for a screen reader", () => {
    localStorage.setItem("icmbot.coachStrip", "0");
    view();
    expect(screen.getByTestId("history-chip")).toHaveAttribute("aria-label", "Hand history");
    expect(screen.getByTestId("history-chip")).toHaveTextContent("");
    expect(screen.getByTestId("details-btn")).toHaveAttribute("aria-label", "Table details");
    expect(screen.getByTestId("coach-chip-folded")).toHaveAttribute("aria-label", "ICM coach");
    expect(screen.getByTestId("coach-chip-folded")).toHaveTextContent("");
  });
});

describe("Spanish", () => {
  it("words the chips, the strip and the drawer", () => {
    view({}, {}, "es");
    expect(screen.getByTestId("details-btn")).toHaveAttribute("aria-label", "Detalles de la mesa");
    expect(screen.getByTestId("history-chip")).toHaveAttribute("aria-label", "Historial de manos");
    expect(screen.getByTestId("strip-why")).toHaveTextContent("¿Por qué?");
    fireEvent.click(screen.getByTestId("history-chip"));
    expect(screen.getByTestId("drawer-tab-hand")).toHaveTextContent("Esta mano");
  });
});
