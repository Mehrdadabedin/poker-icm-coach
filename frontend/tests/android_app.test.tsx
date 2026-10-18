/* The Android app (plan 085): it opens on sign-in instead of the landing
 * page. Its Google button was hidden until plan 088 ran the sign-in in a
 * Chrome tab (tests/android_google.test.tsx). The website is unchanged. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { APP_USER_AGENT, inAndroidApp } from "../src/services/platform";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAuthProviders: vi.fn(async () => ({ google: true, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
}));

const realAgent = navigator.userAgent;
const asApp = (on: boolean) => vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
  on ? `${realAgent} ${APP_USER_AGENT}` : realAgent);

async function openAt(hash: string) {
  window.location.hash = hash;
  const { App } = await import("../src/App");
  render(<App />);
  await act(async () => undefined);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (globalThis as { Capacitor?: unknown }).Capacitor;
});

describe("knowing the page runs in the app", () => {
  it("is false on the website, true with the app's user agent or its Capacitor bridge", () => {
    asApp(false);
    expect(inAndroidApp()).toBe(false);
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(inAndroidApp()).toBe(true);  // an app built before the user agent marker
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
    asApp(true);
    expect(inAndroidApp()).toBe(true);
  });
});

describe("in the app", () => {
  it("opens on sign-in, without the landing page, with the Google button", async () => {
    asApp(true);
    await openAt("#/");
    expect(screen.getByTestId("login-panel")).toBeTruthy();
    expect(screen.queryByTestId("minimal-hero")).toBeNull();
    expect(screen.getByTestId("provider-google")).toBeTruthy();
  });
});

describe("on the website", () => {
  it("keeps the landing page at / and the Google button on sign-in", async () => {
    asApp(false);
    await openAt("#/");
    expect(screen.getByTestId("minimal-hero")).toBeTruthy();
    cleanup();
    await openAt("#/login");
    expect(screen.getByTestId("provider-google")).toBeTruthy();
  });
});
