/* Google sign-in in the Android app (plan 088). Google blocks its sign-in page
 * in app web views, so the app opens it in a Chrome tab, gets a one-time code
 * back on com.pokericmcoach.app://auth, and trades it with the verifier it kept. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createHash } from "node:crypto";
import { getToken } from "../src/services/api";
import { APP_LINK, finishAppGoogle } from "../src/services/appGoogle";
import { APP_USER_AGENT } from "../src/services/platform";

const browser = vi.hoisted(() => ({ open: vi.fn(async () => undefined), close: vi.fn(async () => undefined) }));
const links = vi.hoisted(() => ({ listeners: [] as ((event: { url: string }) => void)[] }));
vi.mock("@capacitor/browser", () => ({ Browser: browser }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_name: string, listener: (event: { url: string }) => void) => {
      links.listeners.push(listener);
      return { remove: async () => undefined };
    }),
    getLaunchUrl: vi.fn(async () => undefined),
  },
}));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAuthProviders: vi.fn(async () => ({ google: true, apple: false, phone: false })),
}));

const VERIFIER_KEY = "icmbot.google.verifier";
const realAgent = navigator.userAgent;
const sha256 = (text: string) => createHash("sha256").update(text).digest("base64url");

function answer(status: number, body: unknown = {}) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

async function openApp(hash: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(`${realAgent} ${APP_USER_AGENT}`);
  window.location.hash = hash;
  const { App } = await import("../src/App");
  render(<App />);
  await act(async () => undefined);
}

beforeEach(() => {
  localStorage.clear();
  links.listeners.length = 0;
  browser.open.mockClear();
  browser.close.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("starting Google sign-in in the app", () => {
  it("opens Google in a Chrome tab with the SHA-256 of a verifier it keeps", async () => {
    await openApp("#/login");
    fireEvent.click(screen.getByTestId("provider-google"));
    await vi.waitFor(() => expect(browser.open).toHaveBeenCalledTimes(1));
    const url = new URL((browser.open.mock.calls[0] as unknown as [{ url: string }])[0].url, "https://x.test");
    expect(url.pathname).toBe("/api/auth/google/start");
    expect(url.searchParams.get("redirect_uri")).toBe(`${window.location.origin}/#/auth/callback`);
    const verifier = localStorage.getItem(VERIFIER_KEY) ?? "";
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(url.searchParams.get("app_challenge")).toBe(sha256(verifier));
    expect(window.location.hash).toBe("#/login");  // the web view itself never goes to Google
  });
});

describe("finishing it when Chrome hands back the link", () => {
  it("trades the code and the verifier for a session, for the sign-in landing page", async () => {
    localStorage.setItem(VERIFIER_KEY, "v".repeat(43));
    const fetch = answer(200, { token: "tok-1", username: "guser" });
    expect(await finishAppGoogle(`${APP_LINK}?code=abc`)).toBe("/auth/callback?token=tok-1&username=guser");
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ code: "abc", verifier: "v".repeat(43) });
    expect(localStorage.getItem(VERIFIER_KEY)).toBeNull();
  });

  it("shows the sign-in error page when Google failed or the account is suspended", async () => {
    localStorage.setItem(VERIFIER_KEY, "v".repeat(43));
    expect(await finishAppGoogle(`${APP_LINK}?error=google_signin_failed`))
      .toBe("/auth/callback?error=google_signin_failed");
    localStorage.setItem(VERIFIER_KEY, "v".repeat(43));
    answer(403, { detail: "this account is suspended" });
    expect(await finishAppGoogle(`${APP_LINK}?code=abc`)).toBe("/auth/callback?error=account_suspended");
  });

  it("ignores a link it did not start, or one it already finished", async () => {
    const fetch = answer(200);
    expect(await finishAppGoogle(`${APP_LINK}?code=abc`)).toBeNull();
    localStorage.setItem(VERIFIER_KEY, "v".repeat(43));
    expect(await finishAppGoogle("https://icmbot.one/#/")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("follows the link from a running app to the menu and closes the Chrome tab", async () => {
    // "#/": the app opens on the sign-in form at "/", so going "home" alone
    // left the form on screen with "Signed in as" under it (owner's phone, 18 Oct)
    await openApp("#/");
    expect(screen.getByTestId("login-panel")).toBeTruthy();
    localStorage.setItem(VERIFIER_KEY, "v".repeat(43));
    // the exchange gives the session; the home page then asks who is signed in
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => new Response(JSON.stringify(
      String(input).endsWith("/app-exchange") ? { token: "tok-2", username: "guser" } : { username: "guser" })));
    await vi.waitFor(() => expect(links.listeners).toHaveLength(1));
    await act(async () => links.listeners[0]({ url: `${APP_LINK}?code=abc` }));
    await vi.waitFor(() => expect(screen.getByTestId("session-username")).toHaveTextContent("guser"));
    expect(window.location.hash).toBe("#/");
    expect(getToken()).toBe("tok-2");
    await vi.waitFor(() => expect(browser.close).toHaveBeenCalled());
  });
});
