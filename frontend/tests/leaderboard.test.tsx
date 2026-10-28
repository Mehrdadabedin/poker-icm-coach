/* The leaderboard page and the Home card (plan 102). The API is mocked. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { LeaderboardHomeCard } from "../src/components/LeaderboardHomeCard";
import { LeaderboardPage } from "../src/pages/LeaderboardPage";
import type { Leaderboard, LeaderboardMe, LeaderboardRow, Period } from "../src/services/leaderboardApi";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

const row = (rank: number, over: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  rank, name: `Player ${rank}`, initial: "P", points: 1000 - rank * 10, wins: 5 - Math.min(rank, 4), played: 10 + rank, photo: null, ...over,
});
const board = (period: Period, rows: LeaderboardRow[], me: LeaderboardMe | null = null, updatedAt = new Date(Date.now() - 5 * 60000).toISOString()): Leaderboard => ({
  period, weekStart: "2026-10-26T00:00:00Z", weekEnd: "2026-11-01T23:59:59Z", updatedAt, rows, me,
});
const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));

function open(data: Record<Period, Leaderboard>, lang: Lang = "en", ui: "page" | "card" = "page") {
  request.mockImplementation(async (path: string) => data[path.endsWith("all") ? "all" : "week"]);
  return render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={[ui === "page" ? "/leaderboard" : "/"]}>
        <Routes>
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/" element={<><LeaderboardHomeCard /><div data-testid="start" /></>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}
const settle = () => act(async () => undefined);

beforeEach(() => { request.mockReset(); localStorage.clear(); localStorage.setItem("icm_auth_token", "t"); });
afterEach(cleanup);

describe("the leaderboard page", () => {
  it("shows the podium as 2nd, 1st, 3rd and the list from 4th", async () => {
    open({ week: board("week", rows(6)), all: board("all", []) });
    await settle();
    const podium = screen.getByTestId("lb-podium");
    expect([...podium.querySelectorAll("li")].map((li) => li.getAttribute("data-testid"))).toEqual(["lb-podium-2", "lb-podium-1", "lb-podium-3"]);
    expect(within(screen.getByTestId("lb-podium-1")).getByText("Player 1")).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-list")).getAllByRole("listitem").map((li) => li.getAttribute("data-testid"))).toEqual(["lb-row-4", "lb-row-5", "lb-row-6"]);
    expect(within(screen.getByTestId("lb-row-4")).getByText("1 win · 14 played")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/api/leaderboard?period=week");
  });

  it("shows a photo where there is one and the initial elsewhere", async () => {
    open({ week: board("week", [row(1, { photo: "data:image/png;base64,AAAA" }), row(2, { initial: "Q" })]), all: board("all", []) });
    await settle();
    expect(within(screen.getByTestId("lb-podium-1")).getByRole("presentation", { hidden: true })).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(within(screen.getByTestId("lb-podium-2")).getByText("Q")).toBeInTheDocument();
  });

  it("the switch asks for the other period", async () => {
    open({ week: board("week", rows(3)), all: board("all", [row(1, { name: "Veteran", points: 12345 })]) });
    await settle();
    fireEvent.click(screen.getByTestId("lb-all"));
    await settle();
    expect(request).toHaveBeenLastCalledWith("/api/leaderboard?period=all");
    expect(screen.getByText("Veteran")).toBeInTheDocument();
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByTestId("lb-all")).toHaveAttribute("aria-checked", "true");
  });

  it("pins the player's own row, also outside the top 100", async () => {
    const me = { state: "ranked" as const, ...row(214, { name: "Ana", points: 120 }) };
    open({ week: board("week", rows(5), me), all: board("all", []) });
    await settle();
    const own = screen.getByTestId("lb-own");
    expect(within(own).getByText("You, Ana")).toBeInTheDocument();
    expect(within(own).getByText("214th")).toBeInTheDocument();
    expect(within(own).getByText("120")).toBeInTheDocument();
  });

  it("asks a player without a profile to make one", async () => {
    open({ week: board("week", rows(3), { state: "noProfile" }), all: board("all", []) });
    await settle();
    expect(screen.getByText("Create your profile to appear")).toHaveAttribute("href", "/profile");
  });

  it("shows no own row when the player has not finished a tournament", async () => {
    open({ week: board("week", rows(3)), all: board("all", []) });
    await settle();
    expect(screen.queryByTestId("lb-own")).toBeNull();
  });

  it("shows one friendly line for an empty board", async () => {
    open({ week: board("week", []), all: board("all", []) });
    await settle();
    expect(screen.getByTestId("lb-empty")).toHaveTextContent("No finished tournaments this week yet.");
    expect(screen.queryByTestId("lb-podium")).toBeNull();
  });

  it("shows the week's dates and the age of the data in English", async () => {
    open({ week: board("week", rows(3)), all: board("all", []) });
    await settle();
    expect(screen.getByTestId("lb-dates")).toHaveTextContent("26 Oct to 1 Nov (UTC)");
    expect(screen.getByText("Updated 5 min ago")).toBeInTheDocument();
  });

  it("speaks Spanish", async () => {
    const me = { state: "ranked" as const, ...row(7, { name: "Ana" }) };
    open({ week: board("week", rows(3), me), all: board("all", []) }, "es");
    await settle();
    expect(screen.getByText("Clasificación")).toBeInTheDocument();
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
    expect(screen.getByText("Siempre")).toBeInTheDocument();
    expect(screen.getByTestId("lb-dates")).toHaveTextContent("26 oct al 1 nov (UTC)");
    expect(screen.getByText("Actualizado hace 5 min")).toBeInTheDocument();
    expect(screen.getByText("Tú, Ana")).toBeInTheDocument();
    expect(screen.getByText("7.º")).toBeInTheDocument();
  });
});

describe("the Home card", () => {
  it("shows the top 3, the player's own row and opens the page", async () => {
    const me = { state: "ranked" as const, ...row(12, { name: "Ana", points: 90 }) };
    open({ week: board("week", rows(10), me), all: board("all", []) }, "en", "card");
    await settle();
    const card = screen.getByTestId("leaderboard-card");
    expect(within(card).getAllByRole("listitem")).toHaveLength(3);
    expect(within(card).getByText("Player 2")).toBeInTheDocument();
    expect(within(card).queryByText("Player 4")).toBeNull();
    expect(screen.getByTestId("leaderboard-card-me")).toHaveTextContent("You, Ana12th · 90 points");
    fireEvent.click(screen.getByTestId("leaderboard-more"));
    await settle();
    expect(screen.getByTestId("lb-podium")).toBeInTheDocument();
  });

  it("is hidden on an error", async () => {
    request.mockRejectedValue(new Error("API 500"));
    render(<MemoryRouter><LeaderboardHomeCard /></MemoryRouter>);
    await settle();
    expect(screen.queryByTestId("leaderboard-card")).toBeNull();
  });

  it("is hidden while loading", () => {
    request.mockReturnValue(new Promise(() => undefined));
    render(<MemoryRouter><LeaderboardHomeCard /></MemoryRouter>);
    expect(screen.queryByTestId("leaderboard-card")).toBeNull();
  });
});
