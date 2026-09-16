/* A03/A18 frontend tests: ICM MASTER sign-in screen and registration flow.
 * - default view is sign-in, no "welcome back"; Enter in a field submits
 * - the sign-up link opens registration (validation + immediate session)
 * - home page shows sign-in when unauthenticated; a stale token is cleared. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
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
  await act(async () => undefined); // let the provider lookup land inside act()
  return screen;
}

describe("ICM MASTER sign-in screen", () => {
  beforeEach(() => localStorage.clear());

  it("opens on the sign-in view with no WELCOME BACK heading", async () => {
    await openForm();
    expect(screen.queryByText(/welcome back/i)).toBeNull();
    // credential fields use the design's wording, backend still wants a username
    expect(screen.getByTestId("username-input")).toHaveAttribute(
      "placeholder",
      "Email or username",
    );
    expect(screen.getByTestId("password-input")).toHaveAttribute("placeholder", "Password");
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
    expect(screen.getByTestId("password-toggle")).toHaveAttribute("aria-label", "Show password");
    // the Google pill, sign-up prompt and brand line are present
    expect(screen.getByTestId("provider-google")).toHaveTextContent("Continue with Google");
    expect(screen.queryByTestId("provider-phone")).toBeNull();
    expect(screen.queryByTestId("provider-apple")).toBeNull();
    expect(screen.getByTestId("go-signup")).toHaveTextContent("Sign up");
    expect(screen.getByText("PRACTICE \u2022 IMPROVE \u2022 WIN")).toBeInTheDocument();
    expect(screen.queryByTestId("confirm-password-input")).toBeNull();
  });

  it("submits the sign-in form with the Enter key (bug 2)", async () => {
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
    fireEvent.click(screen.getByTestId("go-signup"));
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

    // 4) valid registration -> success + immediately authorized
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "abcdef12" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("auth-success")).toHaveTextContent('Account "Jane" created');
    });
    expect(localStorage.getItem("icm_auth_token")).toBe("reg-token-1");
    expect(localStorage.getItem("icm_username")).toBe("Jane");

    // the way back to sign-in is offered
    fireEvent.click(screen.getByTestId("go-signin"));
    expect(screen.queryByTestId("confirm-password-input")).toBeNull();
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
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

  it("home page shows sign-in when unauthenticated and logout when signed in", async () => {
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

  it("clears a stale/invalid stored token and shows sign-in again", async () => {
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
