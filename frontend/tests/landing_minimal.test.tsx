/* The minimal landing page at /minimal: a separate page to compare with the
 * current landing page, which keeps serving "/" (see landing.test.tsx). */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
}));

const scrolledIds: string[] = [];
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
  afterEach(() => vi.restoreAllMocks());

  it("is served at /minimal while / keeps the current landing page", async () => {
    await openAt("#/minimal");
    expect(screen.getByTestId("minimal-landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-page")).toBeNull();
  });

  it("keeps the current landing page at /", async () => {
    await openAt("#/");
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("minimal-landing-page")).toBeNull();
  });

  it("shows the large headline, one sentence and the real product as the picture", async () => {
    await openAt("#/minimal");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Master tournament decisions.");
    expect(screen.getByText("Play 9-handed tournaments against 8 bots. The ICM coach shows the right move, and why.")).toBeInTheDocument();
    expect(screen.getByTestId("minimal-note")).toHaveTextContent("Practice only. No real money. Browser and Android.");
    const frame = screen.getByTestId("minimal-product");
    expect(frame).toHaveTextContent("icmbot.one");
    const picture = within(frame).getByTestId("minimal-hero-visual");
    expect(picture).toHaveAttribute("src", "/images/product-table.webp");
    expect(picture).toHaveAttribute("width", "1680");
    expect(picture).toHaveAttribute("height", "805");
    expect(picture.getAttribute("alt")).toContain("ICM coach recommends a raise");
  });

  it("has a top bar with Log in and Start free only, and no section menu", async () => {
    await openAt("#/minimal");
    const header = screen.getByTestId("minimal-header");
    expect(screen.getByTestId("minimal-brand")).toHaveTextContent("ICMBOT");
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

  it("shows three features, each with an amber inline icon, a short title and one line", async () => {
    await openAt("#/minimal");
    const items = screen.getByTestId("minimal-features").querySelectorAll("li.lm-feature");
    expect(items).toHaveLength(3);
    const titles = Array.from(items).map((item) => item.querySelector("h2")?.textContent);
    expect(titles).toEqual(["Coach at every decision", "Find your mistakes", "ICM calculator"]);
    for (const item of Array.from(items)) {
      const icon = item.querySelector("svg.lm-feature-icon");
      expect(icon).toHaveAttribute("stroke", "currentColor");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(item.querySelectorAll("p")).toHaveLength(1);
    }
    const css = (await import("fs")).readFileSync("src/styles/landing-minimal.css", "utf8");
    // Light page: icons use the deeper amber, gold stays on the main button.
    expect(css).toContain("--lm-accent: #8a5a00");
    expect(css).toMatch(/\.lm-feature-icon \{[^}]*color: var\(--lm-accent\)/);
  });

  it("opens the demo video only on Watch the demo, and never autoplays it", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    await openAt("#/minimal");
    expect(screen.queryByTestId("minimal-video")).toBeNull();
    const watch = screen.getByRole("button", { name: "Watch the demo" });
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

  it("shows one real My Mistakes card as proof", async () => {
    await openAt("#/minimal");
    const proof = screen.getByTestId("minimal-proof");
    expect(within(proof).getByRole("heading", { level: 2 })).toHaveTextContent("See exactly where you went wrong.");
    expect(proof).toHaveTextContent("You: CALL \u2192 Coach: FOLD");
    expect(proof).toHaveTextContent("54o is not in the MP open range.");
    expect(proof).toHaveTextContent("5\u26664\u2660");
  });

  it("ends with the closing line and a footer whose Cookie settings opens the consent banner", async () => {
    await openAt("#/minimal");
    expect(screen.getByTestId("minimal-closing")).toHaveTextContent("Your next tournament starts here.");
    const footer = screen.getByTestId("minimal-footer");
    expect(footer).toHaveTextContent("© 2026 ICMBOT");
    const opened = vi.fn();
    window.addEventListener("icmbot:cookie-settings", opened);
    fireEvent.click(within(footer).getByTestId("minimal-cookie-settings"));
    window.removeEventListener("icmbot:cookie-settings", opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
