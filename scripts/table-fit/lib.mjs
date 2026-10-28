// Shared by check.mjs and shots.mjs: opens the live table in a real browser.
import { createRequire } from "node:module";

const require = createRequire(new URL("../../frontend/node_modules/_probe.cjs", import.meta.url));
export const { chromium } = require("playwright");

export const API = process.env.ICMBOT_API_URL ?? "http://localhost:8000";
export const APP = process.env.ICMBOT_APP_URL ?? "http://localhost:5173";

async function post(path, body) {
  const res = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? res.json() : null;
}

/** A Free account is made on the spot; FIT_USER and FIT_PASS name an existing (Pro or Admin) one. */
export async function account() {
  const { FIT_USER, FIT_PASS } = process.env;
  if (FIT_USER && FIT_PASS) {
    const login = await post("/api/auth/login", { username: FIT_USER, password: FIT_PASS });
    if (!login) throw new Error("FIT_USER / FIT_PASS did not log in");
    return login;
  }
  const name = `fit${Math.random().toString(36).slice(2, 8)}`;
  const made = await post("/api/auth/register", { username: name, password: "fit-check-pass-1" });
  if (!made) throw new Error("could not register a test account");
  return made;
}

/** Opens a table at the given window size and theme and waits for the hero's bet controls. */
export async function openTable(browser, auth, { width, height, theme }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(([token, username, mode]) => {
    localStorage.setItem("icm_auth_token", token);
    localStorage.setItem("icm_username", username);
    localStorage.setItem("icmbot.theme", mode);
    localStorage.setItem("icmbot.analytics.consent", "declined");
  }, [auth.token, auth.username, theme]);
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByTestId("start-practice").click();
  // a Free account starts at once; a Pro one first picks its eight bots
  const next = await Promise.race([
    page.getByTestId("table-page").waitFor({ timeout: 30_000 }).then(() => "table"),
    page.getByTestId("add-bots-to-table").waitFor({ timeout: 30_000 }).then(() => "bots"),
  ]);
  if (next === "bots") {
    for (const id of ["alex", "sarah", "david", "emma"]) {
      for (let i = 0; i < 2; i += 1) await page.getByTestId(`bot-profile-add-${id}`).click();
    }
    await page.getByTestId("add-bots-to-table").click();
  }
  await page.getByTestId("table-page").waitFor({ timeout: 30_000 });
  await page.getByTestId("bet-sizer").waitFor({ timeout: 60_000 });
  return { context, page };
}
