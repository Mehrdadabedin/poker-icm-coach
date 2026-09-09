/* A03/A18 frontend tests: registration-first auth entry.
 * - initial screen shows SIGN IN and SIGN UP
 * - new users register (validation + success) then sign in
 * - existing users sign in with credentials
 * - invalid registration and invalid sign-in show clear errors
 * - home page shows login when unauthenticated, logout clears the session. */
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
  register: vi.fn(async (username: string) => ({ username, registered: true })),
  login: vi.fn(async (username: string) => {
    if (username === "baduser") {
      throw new Error("invalid username or password");
    }
    return { token: "t-123", username };
  }),
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

describe("A18 registration-first authentication", () => {
  beforeEach(() => localStorage.clear());

  async function openForm() {
    const { LoginForm } = await import("../src/components/LoginForm");
    render(
      <MemoryRouter>
        <LoginForm onLogin={() => undefined} />
      </MemoryRouter>,
    );
    return screen;
  }

  it("shows SIGN IN and SIGN UP choices on the first screen", async () => {
    await openForm();
    expect(screen.getByTestId("mode-signin")).toHaveTextContent("SIGN IN");
    expect(screen.getByTestId("mode-signup")).toHaveTextContent("SIGN UP");
    // sign-in mode is default, with username + password fields
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByTestId("username-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
  });

  it("registers a new user with validation, then allows sign in", async () => {
    await openForm();
    // switch to SIGN UP
    fireEvent.click(screen.getByTestId("mode-signup"));
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();

    // 1) missing username -> validation error
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "abcdef12" } });
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "abcdef12" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByTestId("auth-error")).toHaveTextContent("Username is required.");

    // 2) password too short
    fireEvent.change(screen.getByTestId("username-input"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "short" } });
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByTestId("auth-error")).toHaveTextContent(
      "Password must be at least 8 characters.",
    );

    // 3) password mismatch
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "abcdef12" } });
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "abcdef13" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByTestId("auth-error")).toHaveTextContent("Passwords do not match.");

    // 4) valid registration -> success message + switch to SIGN IN
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "abcdef12" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("auth-success")).toHaveTextContent("Account \"Jane\" created");
    });
    // back on the sign-in screen with the username filled in
    expect(screen.getByTestId("mode-signin")).toBeInTheDocument();
  });

  it("signs in a registered user and stores token + username", async () => {
    await openForm();
    fireEvent.change(screen.getByTestId("username-input"), { target: { value: "Mehrdad" } });
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "abcdef12" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => {
      expect(localStorage.getItem("icm_auth_token")).toBe("t-123");
      expect(localStorage.getItem("icm_username")).toBe("Mehrdad");
    });
  });

  it("shows a clear error for invalid sign-in credentials", async () => {
    await openForm();
    fireEvent.change(screen.getByTestId("username-input"), { target: { value: "baduser" } });
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent("invalid username or password");
    });
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
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
    fireEvent.click(second.getByTestId("logout-btn"));
    await waitFor(() => {
      expect(localStorage.getItem("icm_auth_token")).toBeNull();
    });
  });
});
