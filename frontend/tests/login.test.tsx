/* A03/A18 frontend tests: registration-first auth entry.
 * - initial screen shows LOGIN and SIGN UP
 * - no "WELCOME BACK" heading; Enter submits the login form
 * - new users register (validation + success) then sign in
 * - existing users log in with credentials; invalid sign-in shows clear error
 * - stale/invalid stored token is cleared (shows login again)
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
  register: vi.fn(async (username: string) => ({
    username,
    registered: true,
    token: "reg-token-1",
  })),
  login: vi.fn(async (username: string) => {
    if (username === "baduser") {
      throw new Error("invalid username or password");
    }
    return { token: "t-123", username };
  }),
  logout: vi.fn(async () => ({ ok: true })),
  me: vi.fn(async () => {
    if (localStorage.getItem("icm_me_fails")) {
      throw new Error("Authentication required (API 401)");
    }
    return { username: "Mehrdad" };
  }),
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

async function openForm() {
  const { LoginForm } = await import("../src/components/LoginForm");
  render(
    <MemoryRouter>
      <LoginForm onLogin={() => undefined} />
    </MemoryRouter>,
  );
  return screen;
}

describe("A18 registration-first authentication", () => {
  beforeEach(() => localStorage.clear());


  it("shows LOGIN and SIGN UP choices, no WELCOME BACK heading", async () => {
    await openForm();
    expect(screen.getByTestId("mode-signin")).toHaveTextContent("LOGIN");
    expect(screen.getByTestId("mode-signup")).toHaveTextContent("SIGN UP");
    // bug 1: an empty login heading must NOT be present (no WELCOME BACK)
    expect(screen.queryByText(/welcome back/i)).toBeNull();
    expect(screen.queryByTestId("login-heading")).toBeNull();
    // login mode is default, with username + password fields + explanatory text
    expect(screen.getByText(/Sign in to continue to your private practice table/)).toBeInTheDocument();
    expect(screen.getByTestId("username-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
  });

  it("submits the login form with the Enter key (bug 2)", async () => {
    await openForm();
    fireEvent.change(screen.getByTestId("username-input"), { target: { value: "Mehrdad" } });
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "abcdef12" } });
    fireEvent.keyDown(screen.getByTestId("password-input"), { key: "Enter" });
    await waitFor(() => {
      expect(localStorage.getItem("icm_auth_token")).toBe("t-123");
      expect(localStorage.getItem("icm_username")).toBe("Mehrdad");
    });
  });

  it("registers a new user with validation and authorizes the account", async () => {
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

    // 4) valid registration -> success + immediately authorized (Phase 1 fix)
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "abcdef12" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("auth-success")).toHaveTextContent("Account \"Jane\" created");
    });
    // the new account is authorized right away: token stored + onLogin fired
    expect(localStorage.getItem("icm_auth_token")).toBe("reg-token-1");
    expect(localStorage.getItem("icm_username")).toBe("Jane");
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

  it("clears a stale/invalid stored token and shows login again", async () => {
    const { HomePage } = await import("../src/pages/HomePage");
    localStorage.setItem("icm_username", "Ghost");
    localStorage.setItem("icm_auth_token", "stale-token");
    localStorage.setItem("icm_me_fails", "1");
    const first = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(first.getByTestId("login-panel")).toBeInTheDocument();
    });
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
    expect(localStorage.getItem("icm_username")).toBeNull();
  });
});
