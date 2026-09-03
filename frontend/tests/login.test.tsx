/* A03/A04 frontend tests: username login stores the token, login screen
 * appears when unauthenticated, and logout clears the session. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/services/api", () => ({
  getToken: vi.fn(() => localStorage.getItem("icm_auth_token")),
  getUsername: vi.fn(() => localStorage.getItem("icm_username")),
  saveAuth: vi.fn((token: string, username: string) => {
    localStorage.setItem("icm_auth_token", token);
    localStorage.setItem("icm_username", username);
  }),
  clearAuth: vi.fn(() => {
    localStorage.removeItem("icm_auth_token");
    localStorage.removeItem("icm_username");
  }),
  login: vi.fn(async (username: string) => ({ token: "t-123", username })),
  logout: vi.fn(async () => ({ ok: true })),
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  AuthError: class AuthError extends Error {},
  createTournament: vi.fn(),
  getState: vi.fn(),
  sendAction: vi.fn(),
  nextHand: vi.fn(),
  coachAdvice: vi.fn(),
  coachCompare: vi.fn(),
  rangeGrid: vi.fn(),
  request: vi.fn(),
}));

describe("A03 login / logout", () => {
  beforeEach(() => localStorage.clear());

  it("login form signs in and stores the token + username", async () => {
    const { LoginForm } = await import("../src/components/LoginForm");
    render(
      <MemoryRouter>
        <LoginForm onLogin={(u) => void u} />
      </MemoryRouter>,
    );
    const input = screen.getByTestId("username-input");
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Mehrdad" } });
    const submit = screen.getByTestId("login-submit");
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => {
      expect(localStorage.getItem("icm_auth_token")).toBe("t-123");
      expect(localStorage.getItem("icm_username")).toBe("Mehrdad");
    });
  });

  it("home page shows login when unauthenticated and logout when signed in", async () => {
    const { HomePage } = await import("../src/pages/HomePage");
    const first = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(first.getByTestId("login-panel")).toBeInTheDocument();
    first.unmount();

    localStorage.setItem("icm_username", "Mehrdad");
    localStorage.setItem("icm_auth_token", "t-123");
    const second = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(second.getByTestId("session-bar")).toBeInTheDocument();
    expect(second.getByTestId("session-username")).toHaveTextContent("Mehrdad");
    // logout clears the stored session
    fireEvent.click(second.getByTestId("logout-btn"));
    await waitFor(() => {
      expect(localStorage.getItem("icm_auth_token")).toBeNull();
    });
  });
});
