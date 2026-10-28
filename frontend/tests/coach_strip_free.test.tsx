/* The upright phone table for a Free player, and the Android back button (plan 101). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { setUpright, view } from "./strip_helpers";

const { request, openUpgrade, plan } = vi.hoisted(() => ({
  request: vi.fn((_path: string) => new Promise(() => undefined)),
  openUpgrade: vi.fn(),
  plan: { free: true },
}));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));
vi.mock("../src/services/upgrade", () => ({ openUpgrade, closeUpgrade: vi.fn(), useUpgradeOpen: () => false }));
vi.mock("../src/services/plan", () => ({
  usePlan: () => ({ pro: !plan.free, admin: false, known: true, loading: false }),
  useIsFree: () => plan.free,
}));

beforeEach(() => { localStorage.clear(); setUpright(true); plan.free = true; request.mockClear(); openUpgrade.mockClear(); });
afterEach(cleanup);
let onBack: () => void = () => undefined;

describe("a Free player upright", () => {
  it("sees the locked chip, no strip, and a tap opens the Upgrade sheet", () => {
    view();
    expect(screen.queryByTestId("coach-strip")).toBeNull();
    fireEvent.click(screen.getByTestId("coach-chip-top"));
    expect(openUpgrade).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("coach-sheet")).toBeNull();
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("/hands"));
  });

  it("opens the drawer with this hand's actions, and Last hands is the lock line", () => {
    view();
    fireEvent.click(screen.getByTestId("history-chip"));
    expect(screen.getByTestId("history-preflop-0")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("drawer-tab-last"));
    expect(screen.getByTestId("locked-line")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("/hands"));
  });

  it("gets the bot style key, which a Pro player does not", () => {
    view();
    expect(screen.getByTestId("bot-key")).toHaveTextContent("Tight-AggressiveLoose-AggressiveTight-PassiveLoose-Passive");
    cleanup();
    plan.free = false;
    view();
    expect(screen.queryByTestId("bot-key")).toBeNull();
  });

  it("has the key in Spanish", () => {
    view({}, {}, "es");
    expect(screen.getByTestId("bot-key")).toHaveTextContent("Tight agresivo");
  });
});

describe("the Android back button", () => {
  it.each(["history-drawer", "coach-sheet"])("closes the %s", async (id) => {
    plan.free = false;
    vi.doMock("../src/services/platform", () => ({ inAndroidApp: () => true }));
    vi.doMock("@capacitor/app", () => ({
      App: { addListener: async (_: string, cb: () => void) => { onBack = cb; return { remove: async () => undefined }; } },
    }));
    vi.resetModules();
    const { setUpright: up, view: fresh } = await import("./strip_helpers");
    up(true);
    fresh();
    fireEvent.click(screen.getByTestId(id === "history-drawer" ? "history-chip" : "strip-why"));
    await act(async () => undefined);
    act(() => onBack());
    expect(screen.queryByTestId(id)).toBeNull();
    vi.doUnmock("../src/services/platform");
    vi.doUnmock("@capacitor/app");
  });
});
