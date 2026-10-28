/* The minimal landing page, the landing page at / since plan 069. /classic and /minimal links open it. */
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
}));

const scrolledIds: string[] = [];

// Loading the whole app takes seconds on a busy machine (the pre-push hook runs
// everything at once). Once here, not in the first test: that test passed the
// 5 s limit, and the tests after it failed on its leftovers.
beforeAll(async () => {
  await import("../src/App");
}, 30_000);

// HashRouter renders the /login route as the #/login href.

async function openAt(hash: string) {
  window.location.hash = hash;
  const { App } = await import("../src/App");
  render(<App />);
  await act(async () => undefined);
}

describe("minimal landing page (/minimal)", () => {
  beforeEach(() => {
    localStorage.clear();
    scrolledIds.length = 0;
    Element.prototype.scrollIntoView = function (this: Element) { scrolledIds.push(this.id); };
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("is the landing page at / for a visitor without a session (plan 069)", async () => {
    await openAt("#/");
    expect(screen.getByTestId("minimal-landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-page")).toBeNull();
  });

  it("sends old /classic and /minimal links to this page at #/", async () => {
    await openAt("#/classic");
    expect(screen.getByTestId("minimal-landing-page")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/");
    cleanup();
    await openAt("#/minimal");
    expect(screen.getByTestId("minimal-landing-page")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/");
  });

  it("shows the large headline, one sentence and the coach-screen picture", async () => {
    await openAt("#/minimal");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Master tournament decisions");
    expect(screen.getByText("Play 9-handed tournaments against 8 bots. The ICM coach shows the right move, and why.")).toBeInTheDocument();
    expect(screen.getByTestId("minimal-tagline")).toHaveTextContent("PRACTICE · IMPROVE · WIN");
    // the practice-only note lives in the footer, not under the hero button
    expect(screen.getByTestId("minimal-hero")).not.toHaveTextContent("Practice only");
    const picture = screen.getByTestId("minimal-hero-visual");
    expect(picture).toHaveAttribute("src", "/images/hero-coach-screen.webp");
    expect(picture).toHaveAttribute("width", "1602");
    expect(picture).toHaveAttribute("height", "982");
    expect(picture.getAttribute("alt")).toContain("ICM coach recommends a raise");
  });

  it("has a top bar with Log in and Start free only, and no section menu", async () => {
    await openAt("#/minimal");
    const header = screen.getByTestId("minimal-header");
    const logo = within(screen.getByTestId("minimal-brand")).getByRole("img", { name: "ICMBOT" });
    expect(logo).toHaveAttribute("src", "/Logo/logo.png");
    expect(screen.getByTestId("minimal-login")).toHaveAttribute("href", "#/login");
    expect(screen.getByTestId("minimal-login")).toHaveTextContent("Log in");
    expect(screen.getByTestId("minimal-signup")).toHaveAttribute("href", "#/login");
    expect(screen.getByTestId("minimal-signup")).toHaveTextContent("Start free");
    expect(within(header).getAllByRole("link")).toHaveLength(2);
    expect(within(header).queryAllByRole("button")).toHaveLength(0);
  });

  it("offers one action: the hero button, repeated once at the end", async () => {
    await openAt("#/minimal");
    const hero = screen.getByTestId("minimal-hero");
    expect(hero.querySelectorAll(".lm-btn-primary")).toHaveLength(1);
    const primary = document.querySelectorAll(".lm-btn-primary");
    expect(Array.from(primary).map((b) => b.getAttribute("data-testid")))
      .toEqual(["minimal-start", "minimal-closing-start"]);
    for (const button of primary) {
      expect(button).toHaveAttribute("href", "#/login");
      expect(button).toHaveTextContent("Start training free");
    }
  });

  it("shows three features as rounded cards, each with an amber inline icon, a short title and one line", async () => {
    await openAt("#/minimal");
    const items = screen.getByTestId("minimal-features").querySelectorAll("li.lm-card");
    expect(items).toHaveLength(3);
    const titles = Array.from(items).map((item) => item.querySelector("h2")?.textContent);
    expect(titles).toEqual(["Coach at every decision", "Find your mistakes", "ICM calculator"]);
    for (const item of Array.from(items)) {
      const icon = item.querySelector("svg.lm-card-icon");
      expect(icon).toHaveAttribute("stroke", "currentColor");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(item.querySelectorAll("p")).toHaveLength(1);
    }
    const { readFileSync } = await import("fs");
    const css = readFileSync("src/styles/landing-minimal.css", "utf8");
    // Light page: icons use the deeper amber, gold stays on the main button.
    expect(css).toContain("--lm-accent: var(--landing-min-accent)");
    const cards = readFileSync("src/styles/landing-minimal-cards.css", "utf8");
    expect(cards).toMatch(/\.lm-card-icon \{[^}]*color: var\(--lm-accent\)/);
    // white rounded cards that gain a dark grey shadow under the mouse
    expect(cards).toMatch(/\.lm-card \{[^}]*border-radius: 16px;[^}]*background: var\(--landing-min-card-bg\);/);
    expect(cards).toMatch(/\.lm-card:hover \{[^}]*box-shadow: [^;]*var\(--landing-min-card-hover-shadow\)/);
  });

  it("shows How it works as three ordered step cards with an icon each, not a number", async () => {
    await openAt("#/minimal");
    const how = screen.getByTestId("minimal-how");
    expect(within(how).getByRole("heading", { level: 2 })).toHaveTextContent("How it works");
    const steps = how.querySelectorAll("ol > li.lm-card");
    expect(Array.from(steps).map((step) => step.querySelector("h3")?.textContent))
      .toEqual(["Sign up", "Choose your opponents", "Play and get graded"]);
    expect(steps[2]).toHaveTextContent("Every decision is graded Preferred, Acceptable or Suboptimal.");
    for (const step of Array.from(steps)) {
      expect(step.querySelector("svg.lm-card-icon")).toHaveAttribute("aria-hidden", "true");
      expect(step.textContent).not.toMatch(/\d/);
    }
    // the mistake card it replaces is gone
    expect(screen.queryByText("See exactly where you went wrong.")).toBeNull();
  });

  it("opens the demo video only on Watch the demo, and never autoplays it", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    await openAt("#/minimal");
    expect(screen.queryByTestId("minimal-video")).toBeNull();
    const watch = screen.getByRole("button", { name: "Watch the demo" });
    // a rounded outline button beside the gold one, not a second gold button
    expect(watch).toHaveClass("lm-btn", "lm-btn-outline");
    expect(watch).not.toHaveClass("lm-btn-primary");
    expect(watch).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(watch);
    const video = screen.getByTestId("minimal-video");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("poster", "/videos/ICMBOT_video_poster.png");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/ICMBOT_promo.mp4");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("controls");
    expect(watch).toHaveAttribute("aria-expanded", "true");
    expect(scrolledIds).toEqual(["lm-demo"]);

    fireEvent.click(watch);
    expect(screen.getAllByTestId("minimal-video")).toHaveLength(1);
    expect(scrolledIds).toEqual(["lm-demo", "lm-demo"]);
    expect(play).not.toHaveBeenCalled();
  });

  it("ends with the closing line and a footer: copyright left, note and Cookie settings right", async () => {
    await openAt("#/minimal");
    expect(screen.getByTestId("minimal-closing")).toHaveTextContent("Your next tournament starts here.");
    const footer = screen.getByTestId("minimal-footer");
    const [left, right] = Array.from(footer.querySelector(".lm-footer-inner")?.children ?? []);
    expect(left).toHaveTextContent(/^© 2026 ICMBOT$/);
    expect(right).toHaveTextContent("Practice only, no real money.Cookie settings");
    const { readFileSync } = await import("fs");
    const sections = readFileSync("src/styles/landing-minimal-sections.css", "utf8");
    expect(sections).toMatch(/\.lm-footer-inner \{[^}]*justify-content: space-between;/);
    // the consent banner has no floating button once a choice is saved, so the
    // footer link is how a visitor changes it; it opens the shared banner
    const opened = vi.fn();
    window.addEventListener("icmbot:cookie-settings", opened);
    fireEvent.click(within(footer).getByRole("button", { name: "Cookie settings" }));
    window.removeEventListener("icmbot:cookie-settings", opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
