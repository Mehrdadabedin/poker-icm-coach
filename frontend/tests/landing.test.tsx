/* A47 frontend tests: the rebuilt ICMBOT landing page. Entry/sign-in screens
 * stay in landing_entry.test.tsx; the quiz answer is pinned by the backend test. */
import { describe, expect, it, vi, beforeEach } from "vitest";
let scrolled = false;
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: vi.fn(() => localStorage.getItem("icm_auth_token")),
  getUsername: vi.fn(() => localStorage.getItem("icm_username")),
  clearAuth: vi.fn(() => localStorage.clear()),
  health: vi.fn(async () => ({ status: "ok", version: "0.0.0+dev" })),
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
}));

async function openLanding() {
  const { LandingPage } = await import("../src/pages/LandingPage");
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  await act(async () => undefined);
  return screen;
}

describe("public landing page (A47 rebuild)", () => {
  beforeEach(() => {
    localStorage.clear();
    scrolled = false;
    // jsdom has no media engine: play() gets a conforming promise for the overlay.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("play")); return Promise.resolve(); });
    Element.prototype.scrollIntoView = () => { scrolled = true; };
  });

  it("renders a solid header with brand, section buttons and account buttons", async () => {
    await openLanding();
    const header = screen.getByTestId("landing-header");
    expect(header).toHaveClass("lp-header");
    const landingCss = (await import("fs")).readFileSync("src/styles/landing.css", "utf8");
    for (const needle of ["--lp-bg: #07080a", ".lp-header", "background: var(--lp-bg);"]) { expect(landingCss).toContain(needle); }
    expect(screen.getByTestId("landing-brand")).toBeInTheDocument();
    expect(Array.from(header.querySelectorAll("button.lp-nav-link")).map((b) => b.textContent)).toEqual(["Video", "What is ICM", "The Coach", "How it works", "Opponents", "FAQ"]);
    expect(screen.getByTestId("landing-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-signup")).toHaveAttribute("href", "/login");
  });

  it("scrolls to the FAQ section on click without changing the route", async () => {
    await openLanding();
    const hashBefore = window.location.hash;
    fireEvent.click(screen.getByRole("button", { name: "FAQ" }));
    expect(scrolled).toBe(true);
    expect(window.location.hash).toBe(hashBefore);
  });

  it("renders the two-column hero with the H1 and real buttons", async () => {
    const { getByRole } = await openLanding();
    expect(getByRole("heading", { level: 1 }).textContent).toBe("MASTER YOUR TOURNAMENT DECISIONS");
    expect(screen.getByText("TOURNAMENT POKER TRAINER")).toBeInTheDocument();
    expect(screen.getByText(/Play 9-handed tournaments against 8 bots/)).toBeInTheDocument();
    expect(screen.getByTestId("landing-start-training")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("landing-start-training").textContent).toContain("START TRAINING FREE");
    expect(screen.getByText(/Practice only, no real money/)).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero-visual")).toHaveAttribute("src", "/images/hero-sarah-coach.webp");
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
    expect(player.querySelector("source")).toHaveAttribute("src", "/videos/ICMBOT_promo.mp4");
    expect(screen.getByTestId("landing-video-poster").querySelector("img")).toHaveAttribute("src", "/videos/ICMBOT_video_poster.png");
  });

  it("starts the quiz hand on the red backs and turns both cards over", async () => {
    class MockIO {
      static instances: MockIO[] = [];
      cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) { this.cb = cb; MockIO.instances.push(this); }
      observe() {}
      unobserve() {}
      disconnect() {}
      fire() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    }
    vi.stubGlobal("IntersectionObserver", MockIO);
    vi.useFakeTimers();
    await openLanding();
    const hand = screen.getByTestId("landing-quiz-hand");
    const up = () => hand.querySelectorAll(".lp-flip-card-up").length;
    expect(Array.from(hand.querySelectorAll("img.lp-flip-back")).map((i) => i.getAttribute("src"))).toEqual(["/cards/back-red.png", "/cards/back-red.png"]);
    expect(up()).toBe(0);
    act(() => MockIO.instances[0].fire());
    fireEvent.click(hand.querySelectorAll(".lp-flip-card")[0]);
    expect(up()).toBe(1);
    act(() => { vi.advanceTimersByTime(800 + 250 + 700); });
    expect(up()).toBe(2);
    expect(Array.from(hand.querySelectorAll("img.lp-flip-front")).map((i) => i.getAttribute("src"))).toEqual(["/cards/Ks.png", "/cards/Jh.png"]);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the bubble spot and lets both quiz buttons reveal the coach answer", async () => {
    await openLanding();
    const card = screen.getByTestId("landing-quiz-card");
    for (const line of ["4 left, 3 paid.", "K♠ J♥", "Chip leader (40 BB) shoves from the small blind.", "Short stack has 3 BB."]) {
      expect(card.textContent).toContain(line);
    }
    fireEvent.click(screen.getByTestId("landing-quiz-call"));
    const answer = screen.getByTestId("landing-quiz-answer");
    for (const needle of ["The coach says FOLD", "ICM pressure VERY HIGH", "on the bubble", "You picked CALL — the coach folds."]) {
      expect(answer.textContent).toContain(needle);
    }
    expect(answer.textContent).not.toContain("Est. equity");
    expect(answer.textContent).not.toContain("~33% below required");
    fireEvent.click(screen.getByTestId("landing-quiz-fold"));
    expect(screen.getByTestId("landing-quiz-answer").textContent).toContain("You picked FOLD — matches the coach.");
    expect(screen.queryByText(/Same answer from the engine every time/)).toBeNull();
  });

  it("shows the real coach screenshot and the three points", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-coach-shot")).toHaveAttribute("src", "/images/table-coach.webp");
    for (const needle of ["One clear action", "The reason in one line", "The tournament picture"]) {
      expect(screen.getByText(needle)).toBeInTheDocument();
    }
    expect(screen.getByText(/ICM pressure, bubble, stack band, risk premium, pot odds and SPR/)).toBeInTheDocument();
  });

  it("lists the three how-it-works steps with the grade vocabulary", async () => {
    await openLanding();
    for (const needle of ["Sign up", "Choose your opponents", "PREFERRED", "ACCEPTABLE", "SUBOPTIMAL"]) {
      expect(screen.getByTestId("landing-how").textContent).toContain(needle);
    }
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
    expect(perks.querySelectorAll("li.lp-perk")).toHaveLength(9);
    for (const needle of ["Exact ICM", "Push/fold and ranges", "Works with AI agents (WebMCP)", "Eight opponent seats"]) {
      expect(perks.textContent).toContain(needle);
    }
  });

  it("asks exactly the three FAQ questions and never 'Is it free?'", async () => {
    await openLanding();
    const faq = screen.getByTestId("landing-faq");
    for (const needle of ["Is real money involved?", "No. ICMBOT is practice only and never touches real money.", "Do I need to know ICM?", "Does it work on my phone?"]) {
      expect(faq.textContent).toContain(needle);
    }
    expect(screen.queryByText(/Is it free/i)).toBeNull();
  });

  it("renders the final CTA card, footer and the champion image", async () => {
    await openLanding();
    expect(screen.getByTestId("landing-final-card")).toHaveClass("lp-final-card");
    expect(screen.getByText("PLAY YOUR FIRST TOURNAMENT TODAY.")).toBeInTheDocument();
    expect(screen.getByText("Nine players. One champion. Will it be you?")).toBeInTheDocument();
    expect(screen.getByTestId("landing-final-start").textContent).toContain("START TRAINING FREE");
    expect(screen.getByTestId("landing-champion-img")).toHaveAttribute("src", "/images/tournament-champion.webp");
    const footer = screen.getByTestId("landing-footer");
    for (const label of ["Privacy", "Terms", "Cookie settings"]) {
      expect(footer.textContent).toContain(label);
    }
    for (const needle of ["PRACTICE · IMPROVE · WIN", "© 2026 ICMBOT. Practice only. No real-money gambling."]) { expect(footer.textContent).toContain(needle); }
  });

  it("shows Continue with Google only when the backend advertises the provider", async () => {
    await openLanding();
    expect(screen.queryByTestId("landing-google")).toBeNull();
    const { getAuthProviders } = await import("../src/services/api");
    vi.mocked(getAuthProviders).mockResolvedValueOnce({ google: true, apple: false, phone: false });
    await openLanding();
    expect(screen.getByTestId("landing-google")).toBeInTheDocument();
    expect(screen.getByTestId("landing-google").textContent).toContain("Continue with Google");
  });
});
