/* Plan 094: the one-time photo prompt on the bot lineup page, and the hero's
 * initial on the seat until a photo is approved. Neither blocks play. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { PokerSeat } from "../src/components/PokerSeat";
import { PortraitPrompt } from "../src/components/PortraitPrompt";
import type { PlayerView } from "../src/models/game";
import { BotProfilesPage } from "../src/pages/BotProfilesPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const PHOTO = "data:image/webp;base64,UklGRkFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB";
const prompt = (lang: "en" | "es" = "en") => render(
  <I18nProvider initial={lang}><MemoryRouter initialEntries={["/bot-profiles"]}>
    <Routes>
      <Route path="/bot-profiles" element={<PortraitPrompt />} />
      <Route path="/portrait" element={<p>portrait page</p>} />
    </Routes>
  </MemoryRouter></I18nProvider>);
const hero: PlayerView = { seat: 0, name: "ana", stack: 45000, stackInBB: 450, position: "BTN", bet: 0,
  folded: false, isHero: true, isDealer: false, sitsOut: false, holeCards: [] };
const seat = () => render(<I18nProvider initial="en"><PokerSeat player={hero} active={false} /></I18nProvider>);

let signIn = 0;
beforeEach(() => {
  signIn += 1;
  localStorage.setItem("icm_auth_token", `token-${signIn}`);
  localStorage.setItem("icm_username", "ana");
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("the photo prompt", () => {
  it("asks a player with no photo, and Add photo opens the portrait page", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    prompt();
    expect(await screen.findByText("Add your photo")).toBeInTheDocument();
    expect(screen.getByText(/An admin checks it first; you can keep playing meanwhile\./)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("portrait-prompt-add"));
    expect(screen.getByText("portrait page")).toBeInTheDocument();
  });

  it("Not now hides it for that account only", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    prompt();
    fireEvent.click(await screen.findByTestId("portrait-prompt-later"));
    expect(screen.queryByTestId("portrait-prompt")).toBeNull();
    cleanup();
    prompt();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("portrait-prompt")).toBeNull();
    cleanup();
    localStorage.setItem("icm_username", "bea");
    prompt();
    expect(await screen.findByText("Add your photo")).toBeInTheDocument();
  });

  it("tells once that a photo waits for review, and again for a new photo", async () => {
    request.mockResolvedValue({ status: "pending", image: PHOTO });
    prompt();
    expect(await screen.findByText("Your photo is waiting for review")).toBeInTheDocument();
    expect(screen.queryByTestId("portrait-prompt-add")).toBeNull();
    fireEvent.click(screen.getByText("Got it"));
    cleanup();
    request.mockResolvedValue({ status: "pending", image: `${PHOTO}Zm9v` });
    prompt();
    expect(await screen.findByText("Your photo is waiting for review")).toBeInTheDocument();
  });

  it("asks for another photo after a rejection, in Spanish too", async () => {
    request.mockResolvedValue({ status: "rejected", image: PHOTO });
    prompt("es");
    expect(await screen.findByText("Tu foto no fue aprobada")).toBeInTheDocument();
    expect(screen.getByTestId("portrait-prompt-add").textContent).toBe("Elegir otra");
    expect(screen.getByTestId("portrait-prompt-later").textContent).toBe("Entendido");
  });

  it("says nothing once the photo is approved", async () => {
    request.mockResolvedValue({ status: "approved", image: PHOTO });
    prompt();
    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/portrait"));
    expect(screen.queryByTestId("portrait-prompt")).toBeNull();
  });

  it("sits on the bot lineup page without blocking the start", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    render(<I18nProvider initial="en"><MemoryRouter><BotProfilesPage /></MemoryRouter></I18nProvider>);
    expect(await screen.findByTestId("portrait-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("add-bots-to-table")).not.toBeDisabled();
  });
});

describe("the hero's initial on the seat", () => {
  it("shows the initial until a photo is approved", async () => {
    request.mockResolvedValue({ status: "pending", image: PHOTO });
    seat();
    expect(screen.getByTestId("seat-hero-initial")).toHaveAttribute("data-initial", "A");
    expect(screen.getByTestId("seat-0").textContent).not.toMatch(/^A/); // the letter is CSS, the name stays first
  });

  it("gives way to the approved photo", async () => {
    request.mockResolvedValue({ status: "approved", image: PHOTO });
    seat();
    expect(await screen.findByTestId("seat-hero-portrait")).toBeInTheDocument();
    expect(screen.queryByTestId("seat-hero-initial")).toBeNull();
  });

  it("is not shown when signed out", () => {
    localStorage.removeItem("icm_auth_token");
    seat();
    expect(screen.queryByTestId("seat-hero-initial")).toBeNull();
  });
});
