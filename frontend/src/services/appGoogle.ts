/* Google sign-in inside the Android app (plan 088). Google refuses its sign-in
 * page in an app's web view, so the app opens it in a Chrome tab and gets a
 * one-time code back on its own link. Any app can claim that link, so the code
 * is worth nothing without the verifier kept here (PKCE): the server only
 * holds its SHA-256. */
import { API_BASE, saveAuth } from "./api";

export const APP_LINK = "com.pokericmcoach.app://auth";
const VERIFIER_KEY = "icmbot.google.verifier";

function base64url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const failed = (error: string) => `/auth/callback?error=${encodeURIComponent(error)}`;

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function startAppGoogle(): Promise<void> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  // localStorage, not sessionStorage: Android may close the app while Chrome is open
  localStorage.setItem(VERIFIER_KEY, verifier);
  const query = new URLSearchParams({
    redirect_uri: `${window.location.origin}/#/auth/callback`,
    app_challenge: await challengeFor(verifier),
  });
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: `${API_BASE}/api/auth/google/start?${query}` });
}

/** The route to show for a link the app was opened with, or null when the link
 * is not a sign-in this web view started (or one it has already finished). */
export async function finishAppGoogle(link: string): Promise<string | null> {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!link.startsWith(`${APP_LINK}?`) || !verifier) return null;
  localStorage.removeItem(VERIFIER_KEY);
  const params = new URLSearchParams(link.slice(APP_LINK.length + 1));
  const code = params.get("code");
  if (!code) return failed(params.get("error") ?? "google_signin_failed");
  const response = await fetch(`${API_BASE}/api/auth/google/app-exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier }),
  }).catch(() => null);
  if (!response?.ok) return failed(response?.status === 403 ? "account_suspended" : "google_signin_failed");
  const { token, username } = (await response.json()) as { token: string; username: string };
  saveAuth(token, username);
  return "/";
}
