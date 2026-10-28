/* Singular and plural words, the ordinal on the Home card, and where the own row sits (plan 102). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { LeaderboardHomeCard } from "../src/components/LeaderboardHomeCard";
import { LeaderboardPage } from "../src/pages/LeaderboardPage";
import type { Leaderboard, LeaderboardMe, LeaderboardRow } from "../src/services/leaderboardApi";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

const row = (rank: number, wins: number, played: number, points = 100): LeaderboardRow =>
  ({ rank, name: `P${rank}`, initial: "P", points, wins, played, photo: null });
const board = (rows: LeaderboardRow[], me: LeaderboardMe | null = null): Leaderboard =>
  ({ period: "week", weekStart: "2026-10-26T00:00:00Z", weekEnd: "2026-11-01T23:59:59Z", updatedAt: new Date().toISOString(), rows, me });

function open(data: Leaderboard, lang: Lang, ui: "page" | "card") {
  request.mockResolvedValue(data);
  render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={ui === "page" ? <LeaderboardPage /> : <LeaderboardHomeCard />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}
const settle = () => act(async () => undefined);

beforeEach(() => { request.mockReset(); localStorage.clear(); localStorage.setItem("icm_auth_token", "t"); });
afterEach(cleanup);

// 1st and 4th have one win and one tournament; 2nd and 5th have several
const ROWS = [row(1, 1, 1, 1), row(2, 3, 5), row(3, 2, 2), row(4, 1, 1, 1), row(5, 0, 4)];
const ME: LeaderboardMe = { state: "ranked", ...row(9, 1, 1, 1), name: "Ana" };

describe.each([
  ["en", { one: "1 win · 1 played", many: "3 wins · 5 played", zero: "0 wins · 4 played", point: "1 point", points: "100 points" }],
  ["es", { one: "1 victoria · 1 jugado", many: "3 victorias · 5 jugados", zero: "0 victorias · 4 jugados", point: "1 punto", points: "100 puntos" }],
] as const)("singular and plural in %s", (lang, words) => {
  it("uses the singular for 1 in the podium, the list and the own row", async () => {
    open(board(ROWS, ME), lang, "page");
    await settle();
    expect(within(screen.getByTestId("lb-podium-1")).getByText(words.one)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-podium-2")).getByText(words.many)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-row-4")).getByText(words.one)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-row-5")).getByText(words.zero)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-own")).getByText(words.one)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-row-4")).getByLabelText(words.point)).toBeInTheDocument();
    expect(within(screen.getByTestId("lb-podium-2")).getByLabelText(words.points)).toBeInTheDocument();
  });
});

describe("the Home card's own line", () => {
  it.each([
    ["en", { ...ME, rank: 10, points: 260 }, "10th · 260 points"],
    ["en", { ...ME, rank: 22, points: 1 }, "22nd · 1 point"],
    ["es", { ...ME, rank: 10, points: 260 }, "10.º · 260 puntos"],
    ["es", { ...ME, rank: 3, points: 1 }, "3.º · 1 punto"],
  ] as const)("reads the ordinal and points in %s: %s", async (lang, me, text) => {
    open(board([row(1, 1, 1)], me), lang, "card");
    await settle();
    expect(screen.getByTestId("leaderboard-card-me")).toHaveTextContent(text);
  });
});

describe("the pinned own row", () => {
  it("sits in the list's own container, so it has the list's width and position", async () => {
    open(board(ROWS, ME), "en", "page");
    await settle();
    const own = screen.getByTestId("lb-own");
    expect(own.parentElement).toBe(screen.getByTestId("lb-list").parentElement);
    expect(own.compareDocumentPosition(screen.getByTestId("lb-list")) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});
