/* A47 frontend tests: the rebuilt ICMBOT landing page. The entry route and
 * the unchanged sign-in / sign-up screens stay in landing_entry.test.tsx.
 * The quiz answer copy is pinned by backend/tests/test_landing_spot.py. */
import { describe, expect, it, vi, beforeEach } from "vitest";

let scrolled = false;
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
  await act(async () => undefined); // let the providers lookup and footer settle
  return screen;
}

describe("public landing page (A47 rebuild)", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no media engine: give play() a conforming promise so the
    // landing video overlay behaves like a real browser.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
    scrolled = false;
    Element.prototype.scrollIntoView = () => {
      scrolled = true;
    };
  });

  it("renders a solid header with brand, section links and account buttons", async () => {
    await openLanding();
    const header = screen.getByTestId("landing-header");
    expect(header).toHaveClass("lp-header");
    const landingCss = (await import("fs")).readFileSync("src/styles/landing.css", "utf8");
    expect(landingCss).toContain("--lp-bg: #07080a");
    expect(landingCss).toContain(".lp-header");
    expect(landingCss).toContain("background: var(--lp-bg);");
    expect(screen.getByTestId("landing-brand")).toBeInTheDocument();
    for (const label of ["What is ICM", "How it works", "Opponents", "FAQ"]) {
      expect(header.querySelectorAll("a.lp-nav-link").length).toBe(4);
      expect(header.textContent).toContain(label);
    }
    expect(screen.getByTestId("landing-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-signup")).toHaveAttribute("href", "/login");
  });

  it("renders the two-column hero with the H1 and real buttons", async () => {
    const { getByRole } = await openLanding();
    expect(getByRole("heading", { level: 1 }).textContent).toBe("MASTER YOUR TOURNAMENT DECISIONS");
    expect(screen.getByText("TOURNAMENT POKER TRAINER")).toBeInTheDocument();
    expect(screen.getByText(/Play 9-handed tournaments against 8 bots/)).toBeInTheDocument();
    expect(screen.getByTestId("landing-start-training")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-start-training").textContent).toContain("START TRAINING FREE");
    expect(screen.getByText(/Practice only, no real money/)).toBeInTheDocument();
    const visual = screen.getByTestId("landing-hero-visual");
    expect(visual.tagName).toBe("IMG");
    expect(visual).toHaveAttribute("src", "/images/hero-robot.webp");
    // no invisible hit areas over artwork remain
    expect(document.querySelector(".lp-hero-hit")).toBeNull();
  });

  it("scrolls to the demo video from the WATCH DEMO button", async () => {
    await openLanding();
    fireEvent.click(screen.getByTestId("landing-watch-demo"));
    expect(scrolled).toBe(true);
  });

  it("keeps the current demo player and poster", async () => {
    await openLanding();
    const player = screen.getByTestId("landing-video-player");
    expect(player.tagName).toBe("VIDEO");
    expect(player).toHaveAttribute("poster", "/videos/ICMBOT_video_poster.png");
    expect(player.querySelector("source")).toHaveAttribute(
      "src",
      "/videos/ICM_BOT_demo_bot_profiles_narrated.mp4",
    );
    expect(screen.getByTestId("landing-video-poster").querySelector("img")).toHaveAttribute(
      "src",
      "/videos/ICMBOT_video_poster.png",
    );
  });

  it("lets both quiz buttons reveal the pinned coach answer", async () => {
    await openLanding();
    fireEvent.click(screen.getByTestId("landing-quiz-call"));
    const answer = screen.getByTestId("landing-quiz-answer");
    expect(answer.textContent).toContain("FOLD");
    expect(answer.textContent).toContain("65% confident");
    expect(answer.textContent).toContain("AQo equity ~33% below required 54%. ICM pressure MEDIUM.");
    expect(answer.textContent).toContain("Pot odds");
    expect(answer.textContent).toContain("MEDIUM");
    expect(answer.textContent).toContain("Alternative: CALL");
    // FOLD reveals the same engine answer
    fireEvent.click(screen.getByTestId("landing-quiz-fold"));
    expect(screen.getByTestId("landing-quiz-answer").textContent).toContain("FOLD");
  });

  it("shows the real coach screenshot and the three points", async () => {
    await openLanding();
    const shot = screen.getByTestId("landing-coach-shot");
    expect(shot).toHaveAttribute("src", "/images/table-coach.webp");
    expect(screen.getByText("One clear action")).toBeInTheDocument();
    expect(screen.getByText("The reason in one line")).toBeInTheDocument();
    expect(screen.getByText("The tournament picture")).toBeInTheDocument();
    expect(screen.getByText(/ICM pressure, bubble, stack band, risk premium, pot odds and SPR/)).toBeInTheDocument();
  });

  it("lists the three how-it-works steps with the grade vocabulary", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-how").textContent).toContain("Sign up");
    expect(screen.getByTestId("landing-how").textContent).toContain("Choose your opponents");
    expect(screen.getByTestId("landing-how").textContent).toContain("PREFERRED");
    expect(screen.getByTestId("landing-how").textContent).toContain("ACCEPTABLE");
    expect(screen.getByTestId("landing-how").textContent).toContain("SUBOPTIMAL");
  });

  it("renders all four bot profiles from botProfiles.ts", async () => {
    await openLanding();
    const section = screen.getByTestId("landing-opponents");
    for (const name of ["Alex", "Sarah", "David", "Emma"]) {
      expect(section.textContent).toContain(name);
    }
    expect(section.querySelectorAll("img.lp-opponent-portrait")).toHaveLength(4);
    expect(section.textContent).toContain("Tight-Aggressive");
    expect(section.textContent).toContain("Loose-Passive");
  });

  it("shows the nine WHAT YOU GET cards", async () => {
    await openLanding();
    const perks = screen.getByTestId("landing-perks");
    const cards = perks.querySelectorAll("li.lp-perk");
    expect(cards).toHaveLength(9);
    expect(perks.textContent).toContain("Exact ICM");
    expect(perks.textContent).toContain("Push/fold and ranges");
    expect(perks.textContent).toContain("Works with AI agents (WebMCP)");
    expect(perks.textContent).toContain("Eight opponent seats");
  });

  it("asks exactly the three FAQ questions and never 'Is it free?'", async () => {
    await openLanding();
    const faq = screen.getByTestId("landing-faq");
    expect(faq.textContent).toContain("Is real money involved?");
    expect(faq.textContent).toContain("No. ICMBOT is practice only and never touches real money.");
    expect(faq.textContent).toContain("Do I need to know ICM?");
    expect(faq.textContent).toContain("Does it work on my phone?");
    expect(screen.queryByText(/Is it free/i)).toBeNull();
  });

  it("renders the final CTA, footer and the champion image", async () => {
    await openLanding();
    expect(screen.getByText("PLAY YOUR FIRST TOURNAMENT TODAY.")).toBeInTheDocument();
    expect(screen.getByTestId("landing-final-start").textContent).toContain("START TRAINING FREE");
    expect(screen.getByTestId("landing-champion-img")).toHaveAttribute(
      "src",
      "/images/tournament-champion.webp",
    );
    const footer = screen.getByTestId("landing-footer");
    for (const label of ["Privacy", "Terms", "Cookie settings"]) {
      expect(footer.textContent).toContain(label);
    }
    expect(footer.textContent).toContain("© 2026 ICMBOT. Practice only.");
  });

  it("hides Continue with Google when the backend does not advertise it", async () => {
    await openLanding();
    expect(screen.queryByTestId("landing-google")).toBeNull();
  });

  it("offers Continue with Google only when /api/auth/providers says google", async () => {
    const { getAuthProviders } = await import("../src/services/api");
    vi.mocked(getAuthProviders).mockResolvedValueOnce({ google: true, apple: false, phone: false });
    await openLanding();
    expect(screen.getByTestId("landing-google")).toBeInTheDocument();
  });
});
