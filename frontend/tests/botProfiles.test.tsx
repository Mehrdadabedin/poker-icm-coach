/* A27: the multi-BOT lineup builder that START PRACTICE opens. The random-
 * opponents step is gone: every practice table starts from a chosen lineup. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BotProfilesPage } from "../src/pages/BotProfilesPage";
import { HomePage } from "../src/pages/HomePage";

const { createTournament } = vi.hoisted(() => ({
  createTournament: vi.fn(async () => ({ tableId: "T1" })),
}));
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

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={["/", "/bot-profiles"]}>
      <Routes>
        <Route path="/" element={<div data-testid="home-page" />} />
        <Route path="/bot-profiles" element={<BotProfilesPage />} />
        <Route path="/table/:tableId" element={<div data-testid="table-stub" />} />
        <Route path="/login" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openBuilder() {
  renderFlow();
  await act(async () => undefined);
}

const click = async (testid: string) => act(async () => screen.getByTestId(testid).click());
const add = (id: string, n: number) =>
  act(async () => {
    for (let i = 0; i < n; i += 1) screen.getByTestId(`bot-profile-add-${id}`).click();
  });

beforeEach(() => localStorage.clear());
beforeEach(() => createTournament.mockClear());

describe("BACK (A27)", () => {
  it("returns to the home menu", async () => {
    await openBuilder();
    await click("bot-profiles-back");
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });
});

describe("lineup builder (A27)", () => {
  it("shows the four personalities", async () => {
    await openBuilder();
    for (const id of ["alex", "sarah", "david", "emma"]) {
      expect(screen.getByTestId(`bot-profile-${id}`)).toBeInTheDocument();
    }
  });
  it("adds/removes with counts and never goes negative", async () => {
    await openBuilder();
    await click("bot-profile-add-alex");
    await click("bot-profile-add-alex");
    expect(screen.getByTestId("bot-profile-count-alex").textContent).toBe("2");
    await click("bot-profile-remove-alex");
    await click("bot-profile-remove-alex");
    expect(screen.getByTestId("bot-profile-count-alex").textContent).toBe("0");
    expect((screen.getByTestId("bot-profile-remove-alex") as HTMLButtonElement).disabled).toBe(true);
  });
  it("allows repeats of one profile up to 8 and stops at 8", async () => {
    await openBuilder();
    for (let i = 0; i < 9; i += 1) await click("bot-profile-add-alex");
    expect(screen.getByTestId("bot-profile-count-alex").textContent).toBe("8");
    expect(screen.getByTestId("bot-profiles-total").textContent).toContain("8 / 8");
    expect((screen.getByTestId("bot-profile-add-alex") as HTMLButtonElement).disabled).toBe(true);
  });
  it("requires exactly 8 before starting the table", async () => {
    await openBuilder();
    await click("bot-profile-add-alex");
    await click("add-bots-to-table");
    expect(screen.getByTestId("bot-profiles-error")).toHaveTextContent(
      "Please select 8 opponents to fill the tournament.",
    );
    expect(createTournament).not.toHaveBeenCalled();
  });
  it("sends the example lineup (2 Alex + 1 Sarah + 3 David + 2 Emma)", async () => {
    await openBuilder();
    await add("alex", 2);
    await add("sarah", 1);
    await add("david", 3);
    await add("emma", 2);
    const summary = screen.getByTestId("bot-profiles-summary").textContent ?? "";
    expect(summary).toContain("Alex — Tight-Aggressive × 2");
    expect(summary).toContain("David — Tight-Passive × 3");
    expect(screen.getByTestId("bot-profiles-total").textContent).toContain("8 / 8");
    await click("add-bots-to-table");
    expect(createTournament).toHaveBeenCalledWith(10, undefined, [
      "tag", "tag", "lag", "tight_passive", "tight_passive",
      "tight_passive", "loose_passive", "loose_passive",
    ]);
    expect(screen.getByTestId("table-stub")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("icm_bot_lineup") ?? "[]")).toHaveLength(8);
  });

  it("shows the portrait image for every profile", async () => {
    await openBuilder();
    const expected = {
      alex: "/images/bot-profiles/alex.png",
      sarah: "/images/bot-profiles/sarah.png",
      david: "/images/bot-profiles/david.png",
      emma: "/images/bot-profiles/emma.png",
    };
    for (const [id, src] of Object.entries(expected)) {
      const img = screen.getByTestId(`bot-profile-${id}`).querySelector("img");
      expect(img).not.toBeNull();
      expect((img as HTMLImageElement).getAttribute("src")).toBe(src);
    }
  });
  it("shows session-expired message and redirects to login on 401", async () => {
    const { AuthError } = await import("../src/services/api");
    localStorage.setItem("icm_auth_token", "stale-token");
    createTournament.mockRejectedValueOnce(new AuthError("Authentication required (API 401)"));
    await openBuilder();
    for (let i = 0; i < 8; i += 1) await click("bot-profile-add-alex");
    expect(screen.getByTestId("bot-profiles-total").textContent).toContain("8 / 8");
    await click("add-bots-to-table");
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
    expect(screen.getByTestId("auth-session-notice")).toHaveTextContent(
      "Session expired — please log in again.",
    );
    expect(screen.getByTestId("auth-submit")).toBeInTheDocument(); // login form
  });
});

describe("main menu (A26 preserved)", () => {
  it("hides TRAINING; START PRACTICE opens the lineup builder, so BOT PROFILES has no entry", async () => {
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Mehrdad");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bot-profiles" element={<BotProfilesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => undefined);
    expect(screen.queryByTestId("menu-bot-profiles")).toBeNull();
    expect(screen.queryByText("TRAINING")).toBeNull();
    await click("start-practice");
    expect(createTournament).not.toHaveBeenCalled();
    expect(screen.getByTestId("bot-profiles-page")).toBeInTheDocument();
  });
});

describe("footer (A26 preserved)", () => {
  it("renders the new copyright without NEXORA", async () => {
    const { Copyright } = await import("../src/components/Copyright");
    render(<Copyright />);
    expect(screen.getByTestId("app-footer")).toHaveTextContent("© 2026 ICMBOT. All rights reserved.");
  });
});
