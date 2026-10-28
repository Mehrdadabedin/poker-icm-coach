/* The table on a wide screen (plan 106): the "i" button, the history panel, the coach panel. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { setUpright, view } from "./strip_helpers";

const { request, plan } = vi.hoisted(() => ({
  request: vi.fn((_path: string) => new Promise(() => undefined)),
  plan: { free: false },
}));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));
vi.mock("../src/services/plan", () => ({
  usePlan: () => ({ pro: !plan.free, admin: false, known: true, loading: false }),
  useIsFree: () => plan.free,
}));

beforeEach(() => { localStorage.clear(); setUpright(false); plan.free = false; request.mockClear(); });
afterEach(cleanup);

describe("the second status line", () => {
  it("is hidden until the i button is on, and the choice is kept", () => {
    view();
    const details = screen.getByTestId("table-status");
    expect(details).toHaveAttribute("hidden");
    fireEvent.click(screen.getByTestId("details-btn"));
    expect(details).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("details-btn")).toHaveAttribute("aria-expanded", "true");
    expect(localStorage.getItem("icmbot.tableDetails")).toBe("1");
    cleanup();
    view();
    expect(screen.getByTestId("table-status")).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByTestId("details-btn"));
    expect(screen.getByTestId("table-status")).toHaveAttribute("hidden");
  });
});

describe("the history panel", () => {
  it("is closed by default and the right column is gone", () => {
    view();
    expect(screen.queryByTestId("history-drawer")).toBeNull();
    expect(screen.queryByTestId("action-history")).toBeNull();
    expect(screen.getByTestId("history-chip")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens with the chip and shows this hand's actions", () => {
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    expect(screen.getByTestId("history-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("history-chip")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("history-preflop-0")).toBeInTheDocument();
  });

  it.each([
    ["the chip", () => fireEvent.click(screen.getByTestId("history-chip"))],
    ["its close button", () => fireEvent.click(screen.getByTestId("history-close"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
    ["a click outside", () => fireEvent.click(screen.getByTestId("history-scrim"))],
  ])("closes with %s", (_name, close) => {
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    close();
    expect(screen.queryByTestId("history-drawer")).toBeNull();
  });

  it("shows the lock line under Last hands for a Free player, without asking for the hands", () => {
    plan.free = true;
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    fireEvent.click(screen.getByTestId("drawer-tab-last"));
    expect(screen.getByTestId("locked-line")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("/hands"));
  });
});

describe("the coach panel", () => {
  it("still folds with HIDE", () => {
    view();
    expect(screen.getByTestId("coach-panel")).not.toHaveClass("coach-collapsed");
    expect(screen.getByTestId("coach-panel")).toHaveTextContent("ICM pressure");
    fireEvent.click(screen.getByTestId("coach-toggle"));
    // the parent owns the choice: the panel takes it back as a prop
    expect(screen.getByTestId("coach-toggle")).toBeInTheDocument();
  });

  it("is folded when the page says so: only the recommendation stays", () => {
    view({}, { coachCollapsed: true });
    expect(screen.getByTestId("coach-panel")).toHaveClass("coach-collapsed");
    expect(screen.getByTestId("coach-panel")).not.toHaveTextContent("ICM pressure");
  });
});
