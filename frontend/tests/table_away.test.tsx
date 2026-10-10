/* Stepping away from the table (plan 063): HOME and MY MISTAKES stop the
 * table's clock, every page offers BACK TO TABLE, and being on the table
 * again restarts the clock. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { PageHeader } from "../src/components/PageHeader";
import { TableHeader } from "../src/components/TableHeader";
import { useTableAway } from "../src/hooks/useTableAway";
import type { TableState } from "../src/models/game";

const { request } = vi.hoisted(() => ({ request: vi.fn(async () => ({})) }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
  getUsername: () => "meaantonio38",
}));

const AWAY_KEY = "icm_away_table";

/** The table page as far as stepping away is concerned: the hook plus a plain link out. */
function Leaver({ away }: { away?: boolean }) {
  useTableAway("T1", "B", away);
  const navigate = useNavigate();
  return <button onClick={() => navigate("/mistakes")} data-testid="leave">leave</button>;
}

function at(path: string, element: JSX.Element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/start" element={element} />
        <Route path="/mistakes" element={<div data-testid="mistakes-page" />} />
        <Route path="/table/:tableId" element={<div data-testid="table-page" />} />
        <Route path="/" element={<div data-testid="home-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  request.mockClear();
  localStorage.clear();
});

describe("stepping away from the table", () => {
  it("leaving the table by any route stops the clock and remembers the table", async () => {
    at("/start", <Leaver away={false} />);
    await act(async () => fireEvent.click(screen.getByTestId("leave")));
    expect(request).toHaveBeenCalledWith("/api/game/T1/away", { method: "POST" });
    expect(JSON.parse(localStorage.getItem(AWAY_KEY) ?? "null")).toEqual({ tableId: "T1", label: "B" });
    expect(screen.getByTestId("mistakes-page")).toBeTruthy();
  });

  it("being on the table while away restarts the clock and forgets the table", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "T1", label: "B" }));
    at("/start", <Leaver away />);
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith("/api/game/T1/back", { method: "POST" });
    expect(localStorage.getItem(AWAY_KEY)).toBeNull();
  });

  it("does not restart a clock that is already running", async () => {
    at("/start", <Leaver away={false} />);
    await act(async () => undefined);
    expect(request).not.toHaveBeenCalled();
  });

  it("being on a table forgets an older remembered table", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "OLD", label: "A" }));
    at("/start", <Leaver away={false} />);
    await act(async () => undefined);
    expect(localStorage.getItem(AWAY_KEY)).toBeNull();
  });
});

describe("page header", () => {
  it("shows the user, HOME and LOG OUT in the table header's style", () => {
    at("/start", <PageHeader />);
    expect(screen.getByTestId("header-username").textContent).toBe("meaantonio38");
    expect(screen.getByTestId("home-btn").className).toContain("header-btn");
    expect(screen.getByTestId("logout-btn").className).toContain("btn-logout");
    expect(screen.queryByTestId("back-to-table")).toBeNull();
  });

  it("offers BACK TO TABLE after stepping away, and goes there", () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "T1", label: "B" }));
    at("/start", <PageHeader />);
    const back = screen.getByTestId("back-to-table");
    expect(back.textContent).toBe("BACK TO TABLE B");
    fireEvent.click(back);
    expect(screen.getByTestId("table-page")).toBeTruthy();
  });

  it("ignores a damaged stored table instead of crashing", () => {
    localStorage.setItem(AWAY_KEY, "{not json");
    at("/start", <PageHeader />);
    expect(screen.queryByTestId("back-to-table")).toBeNull();
  });
});

describe("table header", () => {
  it("has MY MISTAKES next to HOME", () => {
    const onHome = vi.fn();
    const onMistakes = vi.fn();
    render(
      <TableHeader state={{ tableLabel: "B" } as TableState} username="meaantonio38" paused={false}
        handOver={false} isReview={false} onHome={onHome} onMistakes={onMistakes}
        onLogout={vi.fn()} onTogglePause={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons.indexOf("MY MISTAKES")).toBe(buttons.indexOf("HOME") + 1);
    fireEvent.click(screen.getByTestId("mistakes-btn"));
    expect(onMistakes).toHaveBeenCalledTimes(1);
    expect(onHome).not.toHaveBeenCalled();
  });
});

describe("BACK TO TABLE after leaving by any route", () => {
  it("appears once the table page has closed, even though the page rendered first", async () => {
    at("/start", <PageHeader />);
    expect(screen.queryByTestId("back-to-table")).toBeNull();
    const { stepAway } = await import("../src/services/tableAway");
    await act(async () => { await stepAway("T1", "B"); });
    expect(screen.getByTestId("back-to-table").textContent).toBe("BACK TO TABLE B");
  });
});
