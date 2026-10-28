/* The Upgrade sheet (plan 100): its content and every way to close it. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { UpgradeSheet } from "../src/components/UpgradeSheet";
import { I18nProvider } from "../src/i18n/I18n";
import { closeUpgrade, openUpgrade } from "../src/services/upgrade";

const settle = () => act(async () => undefined);
beforeEach(closeUpgrade);
afterEach(cleanup);

const sheet = async () => {
  render(<I18nProvider><UpgradeSheet /></I18nProvider>);
  act(() => openUpgrade());
};

describe("the Upgrade sheet", () => {

  it("lists five ticks and a Coming soon button that does nothing", async () => {
    await sheet();
    expect(within(screen.getByRole("dialog")).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByTestId("upgrade-soon")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByTestId("upgrade-soon"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each([
    ["the close button", () => fireEvent.click(screen.getByTestId("upgrade-close"))],
    ["Not now", () => fireEvent.click(screen.getByTestId("upgrade-not-now"))],
    ["a tap outside", () => fireEvent.click(screen.getByTestId("upgrade-scrim"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("closes with %s", async (_name, close) => {
    await sheet();
    close();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open when the sheet itself is tapped", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

let onBack: () => void = () => undefined;

describe("the Android back button", () => {
  it("closes the sheet", async () => {
    vi.doMock("../src/services/platform", () => ({ inAndroidApp: () => true }));
    vi.doMock("@capacitor/app", () => ({
      App: { addListener: async (_: string, cb: () => void) => { onBack = cb; return { remove: async () => undefined }; } },
    }));
    vi.resetModules();
    const { UpgradeSheet: Sheet } = await import("../src/components/UpgradeSheet");
    const { openUpgrade: openFresh } = await import("../src/services/upgrade");
    render(<I18nProvider><Sheet /></I18nProvider>);
    act(() => openFresh());
    await settle();
    act(() => onBack());
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.doUnmock("../src/services/platform");
    vi.doUnmock("@capacitor/app");
  });
});

