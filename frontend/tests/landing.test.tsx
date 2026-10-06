/* A16 frontend tests: the public landing page and its links into the existing
 * authentication flow. The entry route and the unchanged sign-in / sign-up
 * screen are in landing_entry.test.tsx. */
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
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no media engine: give play() a conforming promise so the
    // landing video overlay behaves like a real browser (play fires 'play').
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
  });

  it("renders the brand, hero, demo slot, features and final CTA", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.getByTestId("landing-brand")).toHaveTextContent("ICM MASTER");
    expect(screen.getByTestId("landing-hero-visual").querySelector("img")).toHaveAttribute(
      "src", "/images/ICMBOT_target_hero.png",
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

  it("plays the BOT PROFILES demo clip with the ICMBOT poster overlay", async () => {
    await openLanding();
    const player = screen.getByTestId("landing-video-player");
    expect(player.tagName).toBe("VIDEO");
    expect(player).toHaveAttribute("controls");
    expect(player).toHaveAttribute("preload", "metadata");
    expect(player).toHaveAttribute("poster", "/videos/ICMBOT_video_poster.png");
    expect(player).not.toHaveAttribute("autoplay");
    expect(player).not.toHaveAttribute("loop");
    expect(player.querySelector("source")).toHaveAttribute(
      "src",
      "/videos/ICM_BOT_demo_bot_profiles_narrated.mp4",
    );
    // no placeholder artwork and no external host is left behind
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(player.outerHTML).not.toMatch(/youtube|vimeo|http/i);

    // The poster overlay uses the new poster and is visible before playback.
    const overlay = screen.getByTestId("landing-video-poster");
    expect(overlay.querySelector("img")).toHaveAttribute(
      "src",
      "/videos/ICMBOT_video_poster.png",
    );

    // Clicking the overlay starts playback and hides the poster.
    fireEvent.click(overlay);
    expect(screen.queryByTestId("landing-video-poster")).toBeNull();

    // Pausing shows the poster again and keeps the playback position.
    fireEvent.pause(player);
    expect(screen.getByTestId("landing-video-poster")).toBeInTheDocument();
    expect(player).toHaveProperty("currentTime", 0); // jsdom cannot advance time

    // Clicking the poster resumes playback and hides it again.
    fireEvent.click(screen.getByTestId("landing-video-poster"));
    expect(screen.queryByTestId("landing-video-poster")).toBeNull();

    // The clip ending brings the poster back.
    fireEvent.ended(player);
    expect(screen.getByTestId("landing-video-poster")).toBeInTheDocument();
  });

  it("renders a clean header with brand and nav, and the hero visual", async () => {
    await openLanding();
    const header = document.querySelector(".lp-header");
    expect(header).not.toBeNull();
    // brand is present, no h1 in the header
    expect(screen.getByTestId("landing-brand")).toHaveTextContent("ICM MASTER");
    expect(header!.querySelector("h1")).toBeNull();
    // nav links are present
    expect(screen.getByTestId("landing-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-signup")).toHaveAttribute("href", "/login");
    // hero visual exists with the correct artwork
    const visual = screen.getByTestId("landing-hero-visual").querySelector("img");
    expect(visual).not.toBeNull();
    expect(visual?.getAttribute("src")).toBe("/images/ICMBOT_target_hero.png");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("uses the target artwork as the hero with an interaction layer", async () => {
    await openLanding();
    const figure = screen.getByTestId("landing-hero-visual");
    const img = figure.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/images/ICMBOT_target_hero.png");
    // the visible copy lives in the artwork; the DOM mirrors it accessibly
    expect(screen.getAllByText("PRACTICE WITH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ICM BOT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PRACTICE • IMPROVE • WIN").length).toBeGreaterThan(0);
    // invisible hit areas keep the real actions clickable
    const start = screen.getByTestId("landing-start-training");
    expect(start.getAttribute("aria-label")).toBe("Start Training");
    expect(start).toHaveAttribute("href", "/login");
    const watch = screen.getByTestId("landing-watch-demo");
    expect(watch.getAttribute("aria-label")).toBe("Watch How It Works");
    expect(watch.getAttribute("type")).toBe("button");
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

  it("keeps the author copyright footer", async () => {
    await openLanding();
    const footer = screen.getByTestId("app-footer");
    expect(footer).toHaveTextContent("© 2026 — Created by Mehrdad Abedin");
    expect(footer).not.toHaveTextContent("NEXORA");
    expect(footer).toHaveTextContent("Created by Mehrdad Abedin");
    // A23: the version was removed from the copyright line
    expect(footer).not.toHaveTextContent("v0.");
    expect(screen.queryByTestId("app-version")).toBeNull();
  });
});
