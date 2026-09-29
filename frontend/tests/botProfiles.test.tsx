/* A26 — BOT PROFILES: main menu entry, page rendering, selection persistence,
 * and profile forwarding on table creation. The footer no longer shows NEXORA. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const createTournament = vi.fn(async () => ({ tableId: "T0" }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: () => localStorage.getItem("icm_auth_token"),
  getUsername: () => localStorage.getItem("icm_username"),
  clearAuth: () => {
    localStorage.removeItem("icm_auth_token");
    localStorage.removeItem("icm_username");
  },
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  createTournament,
}));

async function openHome() {
  const { HomePage } = await import("../src/pages/HomePage");
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  await act(async () => undefined);
  return screen;
}

async function openProfiles() {
  const { BotProfilesPage } = await import("../src/pages/BotProfilesPage");
  render(
    <MemoryRouter>
      <BotProfilesPage />
    </MemoryRouter>,
  );
  await act(async () => undefined);
  return screen;
}

beforeEach(() => localStorage.clear());
beforeEach(() => createTournament.mockClear());

// The home page requires a stored session: seed the token so the menu shows.
function seedSession() {
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "Mehrdad");
}

describe("main menu (A26)", () => {
  it("shows BOT PROFILES and hides TRAINING", async () => {
    seedSession();
    const screen = await openHome();
    expect(screen.getByTestId("menu-bot-profiles")).toBeInTheDocument();
    expect(screen.queryByText("TRAINING")).toBeNull();
  });
});

describe("BOT PROFILES page (A26)", () => {
  it("renders the four profiles with avatars, styles and selectable state", async () => {
    localStorage.setItem("icm_bot_profile", "sarah");
    const screen = await openProfiles();
    expect(screen.getByTestId("bot-profiles-page")).toBeInTheDocument();
    for (const id of ["alex", "sarah", "david", "emma"]) {
      expect(screen.getByTestId(`bot-profile-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Tight-Aggressive")).toBeInTheDocument();
    expect(screen.getByText("Loose-Aggressive")).toBeInTheDocument();
    expect(screen.getByText("Tight-Passive")).toBeInTheDocument();
    expect(screen.getByText("Loose-Passive")).toBeInTheDocument();
    // Sarah was pre-selected and is visually indicated
    expect(screen.getByTestId("bot-profile-sarah").classList.contains("selected")).toBe(true);
    expect(screen.getByTestId("bot-profiles-current").textContent).toContain("SELECTED: Sarah");
  });

  it("selecting a profile persists it and updates the indication", async () => {
    const screen = await openProfiles();
    await act(async () => {
      screen.getByTestId("bot-profile-david").click();
    });
    expect(localStorage.getItem("icm_bot_profile")).toBe("david");
    expect(screen.getByTestId("bot-profile-david").classList.contains("selected")).toBe(true);
    expect(screen.getByTestId("bot-profiles-current").textContent).toContain("SELECTED: David");
  });
});

describe("profile -> table creation (A26)", () => {
  it("forwards the selected backend profile when starting practice", async () => {
    seedSession();
    localStorage.setItem("icm_bot_profile", "emma");
    const screen = await openHome();
    const { getSelectedProfile } = await import("../src/models/botProfiles");
    expect(getSelectedProfile()?.backend).toBe("loose_passive");
    await act(async () => {
      screen.getByTestId("start-practice").click();
    });
    expect(createTournament).toHaveBeenCalledWith(10, "loose_passive");
  });

  it("starts practice without a profile when none is selected", async () => {
    seedSession();
    const screen = await openHome();
    await act(async () => {
      screen.getByTestId("start-practice").click();
    });
    expect(createTournament).toHaveBeenCalledWith(10, undefined);
  });
});

describe("footer (A26)", () => {
  it("renders the new copyright without NEXORA", async () => {
    const { Copyright } = await import("../src/components/Copyright");
    render(<Copyright />);
    expect(screen.getByTestId("app-footer")).toHaveTextContent("© 2026 — Created by Mehrdad Abedin");
  });
});
