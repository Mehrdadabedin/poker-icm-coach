// Records the ICMBOT demo flow against a LOCAL dev server and logs a timestamp
// for every step (marks.json), so the edit can cut and time each scene.
// Usage (from the repo root): node scripts/demo-video/record_demo.mjs TAKE_DIR PASSWORD_FILE
// The page is zoomed 1.4x in a 1920x1080 window: the layout of a 1371x771
// screen, recorded sharp at full HD (the recorder does not scale the page).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium, request } = require("@playwright/test");

const [OUT, PASS_FILE] = process.argv.slice(2);
const SITE = process.env.SITE ?? "http://localhost:5175";
const API = process.env.API ?? "http://localhost:8766";
const USER = process.env.DEMO_USER ?? "demoplayer";
const ZOOM = process.env.ZOOM ?? "1.4";
const password = readFileSync(PASS_FILE, "utf8").trim();
mkdirSync(OUT, { recursive: true });

// local test account: register, or check the existing one still logs in
const api = await request.newContext({ baseURL: API });
let res = await api.post("/api/auth/register", { data: { username: USER, password } });
if (!res.ok()) res = await api.post("/api/auth/login", { data: { username: USER, password } });
if (!res.ok()) throw new Error(`auth failed: ${res.status()}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
await context.addInitScript((zoom) => {
  localStorage.setItem("icmbot.analytics.consent", "denied");
  document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.zoom = zoom; });
}, ZOOM);
const page = await context.newPage();
const t0 = Date.now();
const marks = [];
const mark = (name) => { marks.push({ name, t: (Date.now() - t0) / 1000 }); console.log(marks.at(-1)); };
const pause = (ms) => page.waitForTimeout(ms);
const tid = (id) => page.locator(`[data-testid="${id}"]`);
// move the mouse to an element first, so the viewer sees where the click goes
const press = async (loc) => { await loc.hover(); await pause(350); await loc.click(); };
const toTop = () => page.evaluate(() => window.scrollTo(0, 0));
// on the table the coach panel must stay in view: glide back after a click
// near the bottom scrolled the page
const glideTop = async () => {
  if (await page.evaluate(() => window.scrollY) === 0) return;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(450);
};
const glideTo = async (id) => {
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "center" }), `[data-testid="${id}"]`);
  await pause(900);
};

// The server is the authority on whose turn it is: right after a click the
// buttons still look enabled until the next poll, so the page cannot tell.
async function server(path, method = "GET") {
  const tableId = page.url().split("/table/")[1]?.split(/[?#/]/)[0];
  const token = await page.evaluate(() => localStorage.getItem("icm_auth_token"));
  const r = await api.fetch(`/api/game/${tableId}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok()) throw new Error(`${path} failed: ${r.status()}`);
  return r.json();
}

async function heroTurnOrHandOver(limitMs = 60000) {
  const end = Date.now() + limitMs;
  while (Date.now() < end) {
    const st = await server("/state");
    if (st.phase === "handOver") {
      await tid("next-hand-btn").waitFor({ timeout: 10000 });
      return "over";
    }
    if (st.waitingForHero) {
      // wait until a button answers: FOLD is greyed out when checking is free,
      // CALL when the only answers to an all-in are fold or all-in
      await page.locator(".hero-controls .btn-fold:enabled, .hero-controls .btn-call:enabled")
        .first().waitFor({ timeout: 15000 });
      await glideTop();
      return "turn";
    }
    await pause(200);
  }
  throw new Error("no hero turn and no hand end within the limit");
}

async function nextHandIfOver() {
  if (!(await tid("next-hand-btn").isVisible().catch(() => false))) return;
  await press(tid("next-hand-btn"));
  await tid("next-hand-btn").waitFor({ state: "hidden", timeout: 15000 });
}

async function panelSays() {
  const text = (await page.locator(".coach-recommendation").first().textContent().catch(() => "")) ?? "";
  return text.trim().toUpperCase();
}

// The panel keeps the previous advice until the new one arrives, so ask the
// server for the current decision and wait until the panel shows the same.
async function coachSays() {
  const advice = String((await server("/coach", "POST")).recommendedAction).trim().toUpperCase();
  const end = Date.now() + 8000;
  while ((await panelSays()) !== advice) {
    if (Date.now() > end) throw new Error(`panel never showed ${advice}`);
    await pause(150);
  }
  return advice;
}

function choiceFor(advice) {
  if (advice.startsWith("RAISE") || advice.startsWith("BET")) return "RAISE";
  if (advice.startsWith("ALL")) return "ALL-IN";
  return advice.split(" ")[0] || "CALL";
}

let raises = 0;
async function act(choice) {
  const c = page.locator(".hero-controls");
  if (choice === "FOLD") {
    // FOLD is greyed out when checking is free (plan 081): check instead
    const fold = c.locator(".btn-fold");
    return press((await fold.isEnabled()) ? fold : c.locator(".btn-call"));
  }
  if (choice === "CALL" || choice === "CHECK") {
    // calling an all-in bigger than the stack is the ALL-IN button
    const call = c.locator(".btn-call");
    return press((await call.isEnabled()) ? call : c.locator(".btn-allin"));
  }
  if (choice === "ALL-IN") return press(c.locator(".btn-allin"));
  // tap a size, let the viewer see the yellow button change, then Enter
  const sizes = ["3x", "2.5x", "1/2", "2/3"].map((k) => page.locator(`[data-testid="size-${k}"]`));
  for (const size of sizes) {
    if (await size.isVisible().catch(() => false)) { mark(raises ? `raise-pick-${raises}` : "raise-pick"); await press(size); break; }
  }
  await pause(1100);
  await page.keyboard.press("Enter");
  mark(raises ? `raise-done-${raises}` : "raise-done");
  raises += 1;
}

// follow the coach to the end of the hand; the first decision may be forced
async function finishHand(label, firstChoice) {
  let forced = firstChoice;
  for (;;) {
    if ((await heroTurnOrHandOver()) === "over") { mark(`${label}-over`); return; }
    const advice = await coachSays();
    await pause(1300); // let the viewer read the coach panel
    const choice = forced ?? choiceFor(advice);
    forced = undefined;
    mark(`${label}-act-${advice}->${choice}`);
    await act(choice);
    await pause(400);
    await glideTop();
  }
}

// a hand worth showing: skip hands the coach folds at once
async function showcaseHand() {
  for (let n = 0; n < 40; n += 1) {
    await nextHandIfOver();
    if ((await heroTurnOrHandOver()) === "over") continue;
    const advice = await coachSays();
    if (choiceFor(advice) !== "RAISE") {
      mark(`skip-${n}`);
      await act(advice.startsWith("CHECK") ? "CHECK" : "FOLD");
      await heroTurnOrHandOver();
      continue;
    }
    mark("showcase-start");
    return finishHand("showcase");
  }
  throw new Error("no raising hand in 40 deals");
}

// a hand with one decision against the coach, so My Mistakes has an entry
async function mistakeHand() {
  for (let n = 0; n < 20; n += 1) {
    await nextHandIfOver();
    if ((await heroTurnOrHandOver()) === "over") continue;
    const advice = await coachSays();
    // a real mistake needs a real fold: calling a free check is not one
    const canFold = await page.locator(".hero-controls .btn-fold").isEnabled();
    if (!advice.startsWith("FOLD") || !canFold) {
      await act(choiceFor(advice) === "RAISE" ? "CALL" : advice.startsWith("CHECK") ? "CHECK" : "CALL");
      await heroTurnOrHandOver();
      continue;
    }
    mark("mistake-start");
    return finishHand("mistake", "CALL");
  }
  throw new Error("no fold advice in 20 deals");
}

// 1. the minimal landing page, then sign in as the demo player
await page.goto(`${SITE}/#/`);
await tid("minimal-hero").waitFor();
mark("landing");
await pause(3500);
await press(tid("minimal-login"));
await tid("login-panel").waitFor();
mark("login");
await page.locator('input[autocomplete="username"]').pressSequentially(USER, { delay: 70 });
await page.locator('input[autocomplete="current-password"]').pressSequentially(password, { delay: 25 });
await pause(300);
await press(tid("auth-submit"));
await tid("start-practice").waitFor();
await toTop();
mark("menu");
await pause(2600);

// 2. choose the bots and start a table
await press(tid("start-practice"));
await toTop();
mark("bots");
for (const id of ["alex", "sarah", "david", "emma"]) {
  for (let i = 0; i < 2; i += 1) { await tid(`bot-profile-add-${id}`).click(); await pause(180); }
}
await pause(500);
await press(tid("add-bots-to-table"));
await page.locator(".hero-controls, [data-testid=next-hand-btn]").first().waitFor({ timeout: 30000 });
mark("table");

// 3. a hand that starts with a raise: the coach's advice, a size, then Enter
await showcaseHand();
await pause(2000);

// 4. a call where the coach folds, then My Mistakes
await mistakeHand();
await pause(1800);
await nextHandIfOver();
mark("next-dealt");
await pause(700);
await press(tid("mistakes-btn"));
await toTop();
mark("mistakes");
await pause(4000);

// 5. Hand History, then the Report, gliding down through it
await press(tid("home-btn"));
await tid("menu-history").waitFor();
await toTop();
await pause(500);
await press(tid("menu-history"));
await toTop();
await tid("history-tournament").waitFor();
mark("history");
await pause(3200);
await press(tid("home-btn"));
await tid("menu-report").waitFor();
await toTop();
await pause(500);
await press(tid("menu-report"));
await toTop();
await tid("report-summary").waitFor({ timeout: 20000 });
mark("report");
await pause(3000);
await glideTo("report-stack-chart");
mark("report-stack");
await pause(2200);
await glideTo("report-heatmap");
mark("report-map");
await pause(2600);
await glideTo("report-bet-sizes");
mark("report-sizes");
await pause(1200);
await press(tid("report-sizes-river"));
await pause(2200);
mark("end");

await context.close(); // finishes the video file
await browser.close();
await api.dispose();
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 2));
console.log("video:", await page.video().path());
