/* A table the server no longer has (tables live in server memory, so a deploy
 * or restart ends them) shows a plain message with a way on, not
 * "API ERROR: API 404", and is forgotten so no button leads back to it. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: vi.fn(() => "t-1"),
  getUsername: vi.fn(() => "meaantonio38"),
  getState: vi.fn(async () => { throw new Error('API 404: {"detail":"table not found"}'); }),
  request: vi.fn(async () => ({})),
}));

const AWAY_KEY = "icm_away_table";

beforeEach(() => localStorage.clear());

describe("a table the server no longer has", () => {
  it("explains it, forgets the table and offers a new practice", async () => {
    localStorage.setItem(AWAY_KEY, JSON.stringify({ tableId: "9f3d9322bf77", label: "A" }));
    const { TablePage } = await import("../src/pages/TablePage");
    render(
      <MemoryRouter initialEntries={["/table/9f3d9322bf77"]}>
        <Routes>
          <Route path="/table/:tableId" element={<TablePage />} />
          <Route path="/bot-profiles" element={<div data-testid="bot-profiles-page" />} />
          <Route path="/" element={<div data-testid="home-page" />} />
        </Routes>
      </MemoryRouter>,
    );
    const gone = await screen.findByTestId("table-gone");
    expect(gone).toHaveTextContent("This table is no longer available.");
    expect(screen.queryByText(/API ERROR/)).toBeNull();
    expect(localStorage.getItem(AWAY_KEY)).toBeNull();
    fireEvent.click(screen.getByTestId("table-gone-start"));
    expect(screen.getByTestId("bot-profiles-page")).toBeTruthy();
  });
});
