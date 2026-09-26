/* A16 frontend tests: the public landing page, its links into the existing
 * authentication flow, and the entry route ("/" = landing when signed out, the
 * existing home screen when signed in). The sign-in and sign-up screens
 * themselves are the existing components and are asserted unchanged here. */
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

async function openLanding() {
  const { LandingPage } = await import("../src/pages/LandingPage");
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
  await act(async () => undefined); // let the footer version lookup land inside act()
  return screen;
}

describe("public landing page", () => {
  beforeEach(() => localStorage.clear());

  it("renders the brand, hero, demo slot, features and final CTA", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.getByTestId("landing-brand")).toHaveTextContent("ICM MASTER");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /master your tournament decisions/i,
    );
    expect(screen.getByTestId("landing-video")).toHaveAttribute("data-video-slot", "16:9");
    expect(screen.getByTestId("landing-features")).toHaveTextContent(/practice realistic/i);
    ["PLAY", "REVIEW", "IMPROVE"].forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    expect(screen.getByTestId("landing-final-cta")).toHaveTextContent(
      /ready to improve your tournament game/i,
    );
  });

  it("plays the bundled demo clip with plain HTML5 controls", async () => {
    await openLanding();
    const player = screen.getByTestId("landing-video-player");
    expect(player.tagName).toBe("VIDEO");
    expect(player).toHaveAttribute("controls");
    expect(player).toHaveAttribute("preload", "metadata");
    expect(player).toHaveAttribute("poster", "/videos/ICMBOT_poster.png");
    expect(player).not.toHaveAttribute("autoplay");
    expect(player).not.toHaveAttribute("loop");
    expect(player.querySelector("source")).toHaveAttribute(
      "src",
      "/videos/ICMBOT_demo_narrated.mp4",
    );
    // no placeholder artwork and no external host is left behind
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(player.outerHTML).not.toMatch(/youtube|vimeo|http/i);
  });

  it("links into the existing authentication flow only", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-login")).toHaveAttribute("href", "/login");
    // SIGN UP uses the same existing sign-in screen: its own "Sign up" link
    // switches to registration, so no auth component is touched.
    expect(screen.getByTestId("landing-signup")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-start-training")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-final-start")).toHaveAttribute("href", "/login");
    // no credential field lives on the landing page
    expect(screen.queryByTestId("password-input")).toBeNull();
  });

  it("keeps the existing NEXORA footer", async () => {
    await openLanding();
    const footer = screen.getByTestId("app-footer");
    expect(footer).toHaveTextContent("NEXORA");
    expect(footer).toHaveTextContent("Created by Mehrdad Abedin");
    // A23: the version was removed from the copyright line
    expect(footer).not.toHaveTextContent("v0.");
    expect(screen.queryByTestId("app-version")).toBeNull();
  });
});

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
