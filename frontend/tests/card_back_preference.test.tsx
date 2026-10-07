/* Settings "Card back: Blue / Red" (default Blue), stored with the display
 * preferences in /api/settings, and used by every face-down card. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PlayingCard } from "../src/components/PlayingCard";
import { SettingsPage } from "../src/pages/SettingsPage";
import { invalidateDisplayPreferences } from "../src/services/preferences";

let stored: Record<string, unknown>;
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const BASE = {
  startingStack: 45000, startingSmallBlind: 100, startingBigBlind: 100, blindLevelMinutes: 20,
  fastMode: false, showActionLabels: true, showResultLabels: true,
};

beforeEach(() => {
  invalidateDisplayPreferences();
  stored = { ...BASE, cardBack: "blue" };
  request.mockReset();
  request.mockImplementation(async (_path: string, options?: RequestInit) => {
    if (options?.method === "PUT") stored = { ...stored, ...JSON.parse(String(options.body)) };
    return { ...stored };
  });
});

async function renderBack() {
  render(<PlayingCard faceDown />);
  await act(async () => undefined);
  return screen.getByTestId("card-back");
}

describe("card back preference", () => {
  it("uses the blue back by default", async () => {
    const back = await renderBack();
    expect(back.getAttribute("src")).toMatch(/cards\/back\.png$/);
  });

  it("uses the red back when the saved preference is red", async () => {
    stored.cardBack = "red";
    const back = await renderBack();
    expect(back.getAttribute("src")).toMatch(/cards\/back-red\.png$/);
  });

  it("offers Blue / Red in Settings, defaults to Blue, and saves the choice", async () => {
    delete stored.cardBack; // a server without the field still reads as Blue
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await act(async () => undefined);
    const select = screen.getByTestId("settings-card-back");
    expect(select).toHaveValue("blue");
    expect([...select.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Blue", "Red"]);

    fireEvent.change(select, { target: { value: "red" } });
    await act(async () => fireEvent.click(screen.getByTestId("settings-save")));
    const put = request.mock.calls.find(([, options]) => options?.method === "PUT");
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ cardBack: "red", showActionLabels: true });
  });

  it("a saved change reaches cards mounted afterwards, not only after a reload", async () => {
    await renderBack(); // caches blue
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await act(async () => undefined);
    fireEvent.change(screen.getByTestId("settings-card-back"), { target: { value: "red" } });
    await act(async () => fireEvent.click(screen.getByTestId("settings-save")));
    render(<PlayingCard faceDown className="after-save" />);
    await act(async () => undefined);
    const after = document.querySelector(".after-save");
    expect(after?.getAttribute("src"), "stale cached card back after SAVE").toMatch(/back-red\.png$/);
  });
});
