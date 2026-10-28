// Takes the table screenshots for the link preview and the landing hero
// (plan 104) from a LOCAL app. See README.md.
// Usage (repo root): node scripts/og-image/capture.mjs OUT_DIR ADMIN_PASSWORD_FILE
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium, request } = require("@playwright/test");

const [OUT, ADMIN_PASS_FILE] = process.argv.slice(2);
const SITE = process.env.SITE ?? "http://localhost:5193";
const API = process.env.API ?? "http://localhost:8793";
const USER = "ogshots";
const ADMIN = process.env.ADMIN_USER ?? "adminuser";
const LINEUP = ["tag", "lag", "tight_passive", "loose_passive", "tag", "lag", "tight_passive", "loose_passive"];
const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  // 1600x1000, not 1280x800: the Spanish side panels overflow the page below about 1500
  wide: { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 },
};
// a spot worth showing: the coach says one of these
const WANTED = /^(RAISE|CALL)\b/;
mkdirSync(OUT, { recursive: true });

const api = await request.newContext({ baseURL: API });
async function signIn(username, password) {
  let res = await api.post("/api/auth/register", { data: { username, password } });
  if (!res.ok()) res = await api.post("/api/auth/login", { data: { username, password } });
  if (!res.ok()) throw new Error(`auth failed for ${username}: ${res.status()}`);
  return (await res.json()).token;
}
const adminPass = readFileSync(ADMIN_PASS_FILE, "utf8").trim();
const userPass = createHash("sha256").update(adminPass).digest("hex").slice(0, 24);
const adminToken = await signIn(ADMIN, adminPass);
const token = await signIn(USER, userPass);
const plan = await api.put(`/api/admin/users/${USER}/plan`, {
  data: { plan: "pro" }, headers: { Authorization: `Bearer ${adminToken}` },
});
if (!plan.ok()) throw new Error(`could not make ${USER} Pro: ${plan.status()}`);
const auth = { Authorization: `Bearer ${token}` };

const browser = await chromium.launch();
for (const lang of ["en", "es"]) {
  for (const [view, opts] of Object.entries(VIEWS)) {
    const created = await api.post("/api/tournament", { data: { players: 9, fast_mode: 10, bots: LINEUP }, headers: auth });
    if (!created.ok()) throw new Error(`tournament failed: ${created.status()}`);
    const tableId = (await created.json()).tableId;
    const context = await browser.newContext(opts);
    await context.addInitScript((t) => {
      localStorage.setItem("icmbot.theme", "dark");
      localStorage.setItem("icmbot.analytics.consent", "denied");
      localStorage.setItem("icm_auth_token", t);
    }, token);
    const page = await context.newPage();
    await page.goto(`${SITE}/?lang=${lang}#/table/${tableId}`);
    const server = async (path, method = "GET") => {
      const r = await api.fetch(`/api/game/${tableId}${path}`, { method, headers: auth });
      if (!r.ok()) throw new Error(`${path} failed: ${r.status()}`);
      return r.json();
    };
    const buttons = page.locator(".hero-controls .btn-fold:enabled, .hero-controls .btn-call:enabled");
    for (let n = 0; n < 60; n += 1) {
      const st = await server("/state");
      if (st.phase === "handOver") {
        await page.locator('[data-testid="next-hand-btn"]').click();
        await page.waitForTimeout(500);
        continue;
      }
      if (!st.waitingForHero) { await page.waitForTimeout(250); continue; }
      await buttons.first().waitFor({ timeout: 15000 });
      const advice = String((await server("/coach", "POST")).recommendedAction).trim().toUpperCase();
      const seats = (await server("/state")).players.length;
      if (WANTED.test(advice) && seats === 9) {
        await page.locator('[data-testid="coach-strip"], .coach-recommendation').first().waitFor();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/${view}-${lang}.png` });
        console.log(`${view}-${lang}: coach says ${advice} after ${n} hands`);
        break;
      }
      const fold = page.locator(".hero-controls .btn-fold");
      await ((await fold.isEnabled()) ? fold : page.locator(".hero-controls .btn-call")).click();
      await page.waitForTimeout(400);
    }
    await context.close();
  }
}
await browser.close();
