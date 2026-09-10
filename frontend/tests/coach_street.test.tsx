/* Issue #7 — coach page must not send a one/two-card board as river. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const analyzeCalls = vi.fn();

vi.mock("../src/services/api", () => ({
  request: async (path: string, options?: RequestInit) => {
    if (path === "/api/coach/advice") {
      analyzeCalls(path, options);
      return { recommendedAction: "FOLD", confidence: 0.5, reasoning: "x",
               alternativeAction: "CALL", detail: {} };
    }
    return { hands: [] };
  },
  createTournament: vi.fn(),
  getToken: vi.fn(() => "t"), getUsername: vi.fn(() => "A"),
  clearAuth: vi.fn(), saveAuth: vi.fn(),
  login: vi.fn(), register: vi.fn(), logout: vi.fn(), me: vi.fn(),
  getState: vi.fn(), sendAction: vi.fn(), nextHand: vi.fn(),
  coachAdvice: vi.fn(), coachCompare: vi.fn(), rangeGrid: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

describe("Issue #7 coach street validation", () => {
  it("disables ANALYZE until the board has a valid street, and never sends river for 1 card", async () => {
    analyzeCalls.mockClear();
    const { CoachPage } = await import("../src/pages/CoachPage");
    render(
      <MemoryRouter>
        <CoachPage />
      </MemoryRouter>,
    );
    const btn = screen.getByTestId("analyze-btn");
    // Default: 0 board cards -> preflop -> ANALYZE is enabled
    expect(btn).not.toBeDisabled();

    // Add exactly ONE board card (2c)
    fireEvent.change(screen.getByTestId("add-card-rank"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("add-card-suit"), { target: { value: "c" } });

    // After 1 card -> NOT READY -> ANALYZE disabled + hint shown
    expect(screen.getByTestId("analyze-btn")).toBeDisabled();
    expect(screen.getByText("Add 0/3/4/5 board cards before analyzing.")).toBeInTheDocument();
    expect(screen.getByText(/BOARD — NOT_READY/)).toBeInTheDocument(); // no valid street

    // Clicking the disabled button must not call the API
    fireEvent.click(screen.getByTestId("analyze-btn"));
    expect(analyzeCalls).not.toHaveBeenCalled();

    // Add a 2nd card -> still NOT READY
    fireEvent.change(screen.getByTestId("add-card-rank"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("add-card-suit"), { target: { value: "d" } });
    expect(screen.getByTestId("analyze-btn")).toBeDisabled();

    // Add a 3rd card -> flop -> ANALYZE enabled and advice callable
    fireEvent.change(screen.getByTestId("add-card-rank"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("add-card-suit"), { target: { value: "h" } });
    expect(screen.getByTestId("analyze-btn")).not.toBeDisabled();
  });
});
