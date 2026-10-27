/* The signed-in home menu: CONTINUE TABLE appears only once a started table
 * was left and only while the server still has it (tables live in server
 * memory, so a deploy or restart ends them), and START PRACTICE goes straight
 * to choosing the 8 opponents: there is no random-opponents step. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "../src/pages/HomePage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
  me: vi.fn(async () => ({ username: "meaantonio38" })),
  adminSummary: vi.fn(async () => { throw new Error("API 403"); }),
}));

const AWAY_KEY = "icm_away_table";
const notFound = () => Promise.reject(new Error('API 404: {"detail":"table not found"}'));

function openHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bot-profiles" element={<div data-testid="bot-profiles-page" />} />
        <Route path="/table/:tableId" element={<div data-testid="table-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const settle = () => act(async () => undefined);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "meaantonio38");
  request.mockReset();
});

describe("CONTINUE TABLE", () => {
  it("is not offered right after login, before any table was started", async () => {
    openHome();
    await settle();
    expect(screen.queryByTestId("continue-table")).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("is not offered for a table the server no longer has, and that table is forgotten", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "9f3d9322bf77", label: "A" }));
    request.mockImplementation(notFound);
    openHome();
    await settle();
    expect(request).toHaveBeenCalledWith("/api/game/9f3d9322bf77/state");
    expect(screen.queryByTestId("continue-table")).toBeNull();
    expect(localStorage.getItem(AWAY_KEY)).toBeNull();
  });

  it("is not offered for a finished tournament", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "T1", label: "B" }));
    request.mockResolvedValue({ status: "finished" });
    openHome();
    await settle();
    expect(screen.queryByTestId("continue-table")).toBeNull();
    expect(localStorage.getItem(AWAY_KEY)).toBeNull();
  });

  it("is hidden but the table kept when the server cannot be reached", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "T1", label: "B" }));
    request.mockRejectedValue(new Error("Failed to fetch"));
    openHome();
    await settle();
    expect(screen.queryByTestId("continue-table")).toBeNull();
    expect(localStorage.getItem(AWAY_KEY)).not.toBeNull();
  });

  it("is offered once a started table was left and the server still has it", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "T1", label: "B" }));
    request.mockResolvedValue({ status: "active" });
    openHome();
    const button = await screen.findByTestId("continue-table");
    expect(button).toHaveTextContent("Continue table B");
    fireEvent.click(button);
    expect(screen.getByTestId("table-page")).toBeTruthy();
  });
});

describe("menu cards (plan 066)", () => {
  it("puts play first, then study, review and setup, each card with an icon and one line", async () => {
    openHome();
    await settle();
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    const labels = Array.from(menu.querySelectorAll(".hm-label")).map((l) => l.textContent);
    expect(labels).toEqual(["STUDY", "REVIEW", "SETUP"]);
    const cards = Array.from(menu.querySelectorAll("button.hm-card"));
    expect(cards.map((c) => c.querySelector(".hm-title")?.textContent)).toEqual([
      "Start practice", "ICM coach", "Ranges", "ICM calculator", "Glossary",
      "My mistakes", "Hand history", "Report", "Tournament settings", "Your profile",
    ]);
    for (const card of cards) {
      expect(card.querySelector("svg.hm-icon")).toHaveAttribute("aria-hidden", "true");
      expect(card.querySelector(".hm-desc")?.textContent).toBeTruthy();
    }
    // Start practice opens the lineup builder, so BOT PROFILES has no card
    expect(screen.queryByTestId("menu-bot-profiles")).toBeNull();
    // the Report (plan 078) replaces Statistics, which asked for a table id
    expect(screen.queryByTestId("menu-statistics")).toBeNull();
    expect(screen.getByTestId("home-page")).toHaveClass("home-screen");
    // under the mouse a card turns a clearly brighter slate than its #1d242c
    const css = (await import("fs")).readFileSync("src/styles/home-menu.css", "utf8");
    expect(css).toMatch(/\.hm-card \{[^}]*background: #1d242c;/);
    expect(css).toMatch(/\.hm-card:hover \{[^}]*background: #3a4656;/);
  });
});

describe("START PRACTICE", () => {
  it("opens the lineup builder directly, with no random-opponents step", async () => {
    openHome();
    await settle();
    fireEvent.click(screen.getByTestId("start-practice"));
    expect(screen.getByTestId("bot-profiles-page")).toBeTruthy();
  });

  it("sends an old /start link to the lineup builder", async () => {
    window.location.hash = "#/start";
    const { App } = await import("../src/App");
    render(<App />);
    await settle();
    expect(screen.getByTestId("bot-profiles-page")).toBeInTheDocument();
    expect(screen.queryByText(/RANDOM OPPONENTS/)).toBeNull();
  });
});
