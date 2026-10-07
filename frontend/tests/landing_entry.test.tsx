/* A16 tests: the entry route ("/" = landing when signed out, the existing
 * home screen when signed in) and the unchanged sign-in / sign-up screen. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: vi.fn(() => localStorage.getItem("icm_auth_token")),
  getUsername: vi.fn(() => localStorage.getItem("icm_username")),
  clearAuth: vi.fn(() => {
    localStorage.removeItem("icm_auth_token");
    localStorage.removeItem("icm_username");
  }),
  health: vi.fn(async () => ({ status: "ok", version: "0.0.0+dev" })),
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
}));

async function openEntry() {
  window.location.hash = "#/";
  const { App } = await import("../src/App");
  render(<App />);
  await act(async () => undefined);
  return screen;
}

describe("entry route", () => {
  beforeEach(() => localStorage.clear());

  it("shows the landing page to a visitor without a session", async () => {
    await openEntry();
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).toBeNull();
  });

  it("keeps the existing home screen for a signed-in user", async () => {
    localStorage.setItem("icm_auth_token", "t-123");
    localStorage.setItem("icm_username", "Mehrdad");
    await openEntry();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("start-practice")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-page")).toBeNull();
  });
});

describe("existing authentication screen entry modes", () => {
  beforeEach(() => localStorage.clear());

  it("still opens on the sign-in view when no mode is requested", async () => {
    const { LoginForm } = await import("../src/components/LoginForm");
    render(
      <MemoryRouter>
        <LoginForm onLogin={() => undefined} />
      </MemoryRouter>,
    );
    await act(async () => undefined);
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
    expect(screen.queryByTestId("confirm-password-input")).toBeNull();
  });

  it("keeps its own sign-up switch for registration", async () => {
    const { LoginForm } = await import("../src/components/LoginForm");
    render(
      <MemoryRouter>
        <LoginForm onLogin={() => undefined} />
      </MemoryRouter>,
    );
    await act(async () => undefined);
    fireEvent.click(screen.getByTestId("go-signup"));
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign up");
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
  });
});
