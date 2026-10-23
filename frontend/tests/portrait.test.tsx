/* Player portraits (plan 094): the portrait page, the photo on the hero's
 * seat once approved, and the Admin review. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { AdminPortraitsView } from "../src/components/AdminPortraitsView";
import { PokerSeat } from "../src/components/PokerSeat";
import type { PlayerView } from "../src/models/game";
import { PortraitPage } from "../src/pages/PortraitPage";
import { APP_USER_AGENT } from "../src/services/platform";

const { request, resizePortrait } = vi.hoisted(() => ({ request: vi.fn(), resizePortrait: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));
vi.mock("../src/services/resizePortrait", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resizePortrait,
}));

const PHOTO = "data:image/webp;base64,UklGRg==";
const page = (lang: "en" | "es" = "en") =>
  render(<I18nProvider initial={lang}><MemoryRouter><PortraitPage /></MemoryRouter></I18nProvider>);
const asApp = () => vi.spyOn(navigator, "userAgent", "get").mockReturnValue(`Mozilla/5.0 ${APP_USER_AGENT}`);
const seat = (player: PlayerView) =>
  render(<I18nProvider initial="en"><PokerSeat player={player} active={false} /></I18nProvider>);
const hero: PlayerView = { seat: 0, name: "Ana", stack: 45000, stackInBB: 450, position: "BTN", bet: 0,
  folded: false, isHero: true, isDealer: false, sitsOut: false, holeCards: [] };

let signIn = 0;
beforeEach(() => {
  // a new sign-in per test, so the cached photo never leaks between tests
  signIn += 1;
  localStorage.setItem("icm_auth_token", `token-${signIn}`);
  localStorage.setItem("icm_username", "ana");
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("the portrait page", () => {
  it("shows the initial and NO PHOTO before any upload", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    page();
    expect(await screen.findByText("NO PHOTO")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your portrait" })).toBeInTheDocument();
    expect(screen.getByTestId("portrait-circle").textContent).toBe("A");
    expect(screen.getByText("Add a photo of yourself. It stays hidden until an admin approves it.")).toBeInTheDocument();
    expect(screen.getByTestId("portrait-choose").textContent).toBe("Choose a photo");
    expect(screen.getByText("JPG, PNG or WebP. The photo is resized before upload.")).toBeInTheDocument();
    expect(screen.getByTestId("portrait-input")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("uploads the resized photo, which then waits for review", async () => {
    request.mockImplementation(async (_path: string, options?: RequestInit) =>
      (options?.method === "PUT" ? { status: "pending", image: PHOTO } : { status: "none", image: null }));
    resizePortrait.mockResolvedValue({ contentType: "image/webp", data: "UklGRg==" });
    page();
    await screen.findByText("NO PHOTO");
    const file = new File(["x"], "me.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("portrait-input"), { target: { files: [file] } });
    expect(await screen.findByText("WAITING FOR REVIEW")).toBeInTheDocument();
    expect(resizePortrait).toHaveBeenCalledWith(file);
    expect(request).toHaveBeenCalledWith("/api/portrait",
      { method: "PUT", body: JSON.stringify({ contentType: "image/webp", data: "UklGRg==" }) });
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", PHOTO);
    expect(screen.getByTestId("portrait-choose").textContent).toBe("Choose another photo");
  });

  it("says so when a file cannot be used", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    resizePortrait.mockRejectedValue(new Error("unsupported type"));
    page();
    await screen.findByText("NO PHOTO");
    fireEvent.change(screen.getByTestId("portrait-input"), { target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("That file could not be used.");
    expect(screen.getByText("NO PHOTO")).toBeInTheDocument();
  });

  it("removes the photo, in Spanish too", async () => {
    request.mockImplementation(async (_path: string, options?: RequestInit) =>
      (options?.method === "DELETE" ? { status: "none", image: null } : { status: "approved", image: PHOTO }));
    page("es");
    expect(await screen.findByText("APROBADA")).toBeInTheDocument();
    expect(screen.getByText("Tu foto se muestra en tu asiento de la mesa.")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("portrait-remove"));
    expect(await screen.findByText("SIN FOTO")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/api/portrait", { method: "DELETE" });
  });
});

describe("taking a photo with the camera", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is offered in the app, next to the gallery, and opens the front camera", async () => {
    asApp();
    request.mockImplementation(async (_path: string, options?: RequestInit) =>
      (options?.method === "PUT" ? { status: "pending", image: PHOTO } : { status: "none", image: null }));
    resizePortrait.mockResolvedValue({ contentType: "image/jpeg", data: "/9j/" });
    page();
    expect(await screen.findByTestId("portrait-camera")).toHaveTextContent("Take a photo");
    expect(screen.getByTestId("portrait-choose")).toHaveTextContent("Choose a photo");
    const camera = screen.getByTestId("portrait-camera-input");
    expect(camera).toHaveAttribute("capture", "user");
    expect(camera).toHaveAttribute("accept", "image/*"); // the app opens the camera only for image/*
    const shot = new File(["x"], "JPEG_1.jpg", { type: "image/jpeg" });
    fireEvent.change(camera, { target: { files: [shot] } });
    expect(await screen.findByText("WAITING FOR REVIEW")).toBeInTheDocument();
    expect(resizePortrait).toHaveBeenCalledWith(shot);
  });

  it("is offered on a touch screen, in Spanish too", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
      ({ matches: query === "(pointer: coarse)" }) as MediaQueryList);
    request.mockResolvedValue({ status: "none", image: null });
    page("es");
    expect(await screen.findByTestId("portrait-camera")).toHaveTextContent("Hacer una foto");
  });

  it("is not offered on a desktop browser", async () => {
    request.mockResolvedValue({ status: "none", image: null });
    page();
    await screen.findByText("NO PHOTO");
    expect(screen.queryByTestId("portrait-camera")).toBeNull();
    expect(screen.queryByTestId("portrait-camera-input")).toBeNull();
  });
});

describe("the photo on the hero's seat", () => {
  it("shows the approved photo, like a BOT's portrait", async () => {
    request.mockResolvedValue({ status: "approved", image: PHOTO });
    seat(hero);
    expect(await screen.findByTestId("seat-hero-portrait")).toHaveAttribute("src", PHOTO);
  });

  it("shows nothing while the photo waits for review", async () => {
    request.mockResolvedValue({ status: "pending", image: PHOTO });
    seat(hero);
    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/portrait"));
    expect(screen.queryByTestId("seat-hero-portrait")).toBeNull();
  });

  it("shows an approval from the next hand, without a reload", async () => {
    request.mockResolvedValueOnce({ status: "pending", image: PHOTO });
    seat(hero);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    cleanup(); // the hand review replaces the table; the next hand mounts the seat again
    request.mockResolvedValue({ status: "approved", image: PHOTO });
    seat(hero);
    expect(await screen.findByTestId("seat-hero-portrait")).toHaveAttribute("src", PHOTO);
  });

  it("asks only for the hero, and never when signed out", async () => {
    seat({ ...hero, isHero: false, profile: "tag" });
    localStorage.removeItem("icm_auth_token");
    cleanup();
    seat(hero);
    await Promise.resolve();
    expect(request).not.toHaveBeenCalledWith("/api/portrait"); // the card back may still ask for /api/settings
  });
});

describe("the Admin photo review", () => {
  it("lists waiting photos and approves one", async () => {
    request.mockImplementation(async (path: string) => (path === "/api/admin/portraits"
      ? { portraits: [{ username: "ana", image: PHOTO, updatedAt: "2026-10-21T10:00:00Z" }] }
      : { username: "ana", status: "approved" }));
    render(<AdminPortraitsView />);
    expect(await screen.findByRole("img", { name: "Photo from ana" })).toHaveAttribute("src", PHOTO);
    fireEvent.click(screen.getByTestId("approve-ana"));
    expect(await screen.findByTestId("admin-portraits-empty")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/api/admin/portraits/ana/approve", { method: "POST" });
  });
});
