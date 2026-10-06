/**
 * record.mjs — reproduce the ICMBOT promo video (A48).
 *
 * Drives the REAL app: backend + vite dev are started when down, a "Hero"
 * demo account is created through the API with a random password (never
 * logged or committed), and the running game is controlled ONLY through the
 * page's WebMCP tools (a stand-in document.modelContext injected before the
 * app loads collects them on window.__webmcp). The coach panel's
 * recommendation is followed every turn. Outputs the 1920x1080 webm to
 * /tmp/icmbot-promo, then invokes encode.mjs (ffmpeg, captions, poster).
 *
 * Run from the frontend:  npm run record:promo
 * Encoder setup (once):    uv venv scripts/record-promo/.venv &&
 *   uv pip install --python scripts/record-promo/.venv/bin/python imageio-ffmpeg
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const HERE = new URL(".", import.meta.url);
const ROOT_DIR = new URL("../../", import.meta.url).pathname;
const require = createRequire(new URL("../../frontend/node_modules/_probe.cjs", import.meta.url));
const { chromium } = require("playwright");

const API = process.env.ICMBOT_API_URL ?? "http://localhost:8000";
const APP = process.env.ICMBOT_APP_URL ?? "http://localhost:5173";
const HAND_COUNT = 4;
const RECORDING_DIR = "/tmp/icmbot-promo";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function httpOK(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}
const started = [];
async function ensure(url, command, name) {
  if (await httpOK(url)) return;
  const proc = spawn("bash", ["-lc", command], { cwd: ROOT_DIR, stdio: "ignore" });
  started.push(proc);
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    if (await httpOK(url)) return;
  }
  throw new Error(`${name} did not become ready: ${url}`);
}

const CREDS_FILE = new URL(".venv/hero-credentials.json", import.meta.url).pathname;
function readCreds() {
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
  } catch {
    return null;
  }
}
async function heroAccount() {
  const sign = async (path, password) => {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Hero", password }),
    });
    return res.ok ? res.json() : null;
  };
  const password = crypto.randomBytes(9).toString("base64url");
  const created = await sign("/api/auth/register", password);
  if (created) {
    fs.writeFileSync(CREDS_FILE, JSON.stringify({ username: "Hero", password }));
    return { username: "Hero", password };
  }
  // A leftover Hero account from a previous run: reuse its stored password.
  const stored = readCreds();
  if (stored && (await sign("/api/auth/login", stored.password))) {
    return stored;
  }
  throw new Error(
    "an existing Hero account blocks the recording. Stop the backend, delete backend/data/users.json, and retry.",
  );
}

async function callTool(page, name, input = {}) {
  return page.evaluate(async (n, i) => {
    const tool = (window.__webmcp ?? {})[n];
    return tool ? await tool.execute(i) : null;
  }, name, input);
}
async function gameState(page) {
  return callTool(page, "get_game_state");
}
async function waitFor(page, match, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await gameState(page);
    if (match(state)) return state;
    await sleep(450);
  }
  throw new Error(`timeout waiting for ${what}`);
}
async function coachRecommendation(page) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const text = await page
      .locator(".coach-panel .coach-recommendation")
      .textContent({ timeout: 1500 })
      .catch(() => "");
    if (text && text.trim()) return text.trim().toUpperCase();
    await sleep(350);
  }
  return "";
}
function actionFor(rec, state) {
  const legal = (state?.availableActions ?? []).map((a) => a.kind);
  const allIn = state?.availableActions?.find((a) => a.kind === "all_in");
  if (rec === "FOLD" || rec === "CHECK" || rec === "CALL") {
    return legal.includes(rec.toLowerCase()) ? { name: rec.toLowerCase(), input: {} } : null;
  }
  if (rec === "BET") {
    const bet = state?.availableActions?.find((a) => a.kind === "bet");
    return bet ? { name: "bet", input: { amount: bet.minAmount } } : null;
  }
  // RAISE / 3-BET / RESHOVE / OPEN JAM have no dedicated WebMCP tool: the
  // closest legal shove is the advertised all-in, which reuses the game rule.
  return allIn ? { name: "all_in", input: {} } : null;
}
function fallbackAction(state) {
  const legal = (state?.availableActions ?? []).map((a) => a.kind);
  if (legal.includes("check")) return { name: "check", input: {} };
  if (legal.includes("call")) return { name: "call", input: {} };
  if (legal.includes("all_in")) return { name: "all_in", input: {} };
  const bet = state?.availableActions?.find((a) => a.kind === "bet");
  return bet ? { name: "bet", input: { amount: bet.minAmount } } : null;
}

async function playHand(page, final = false) {
  const state = await waitFor(page, (s) => s && s.phase === "playing" && s.tournament.handNumber > 0, 60_000, "a live hand");
  const handNumber = state.tournament.handNumber;
  let acted = 0;
  while (acted < 6) {
    const current = await gameState(page);
    if (!current) {
      await sleep(400);
      continue;
    }
    if (current.phase === "handOver") {
      await callTool(page, "pause_game");
      await sleep(2200);
      if (!final) {
        await callTool(page, "next_hand");
      }
      return handNumber;
    }
    if (current.waitingForHero) {
      const rec = await coachRecommendation(page);
      const action = actionFor(rec, current) ?? fallbackAction(current);
      if (action) {
        await callTool(page, action.name, action.input);
        acted += 1;
      }
      await sleep(1000);
      continue;
    }
    await sleep(450);
  }
  await waitFor(page, (s) => s && s.phase === "handOver", 60_000, "hand completion");
  await callTool(page, "pause_game");
  await sleep(2200);
  if (!final) {
    await callTool(page, "next_hand");
  }
  return handNumber;
}

async function findFfmpeg() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  const py = new URL(".venv/bin/python", HERE).pathname;
  const run = (command) =>
    new Promise((resolve) => {
      const child = spawn("bash", ["-lc", command], { stdio: ["ignore", "pipe", "ignore"] });
      let out = "";
      child.stdout.on("data", (b) => {
        out += b;
      });
      child.on("exit", () => resolve(out.trim()));
    });
  const probe = await run(`${py} -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'`);
  if (probe && fs.existsSync(probe)) return probe;
  const onPath = await run("command -v ffmpeg");
  if (onPath && fs.existsSync(onPath)) return onPath;
  throw new Error(
    `ffmpeg not found (venv probe: ${JSON.stringify(probe)}). Set FFMPEG_BIN or run the record-promo venv setup (scripts/record-promo/README.md).`,
  );
}

async function main() {
  const ffmpeg = await findFfmpeg();
  process.env.FFMPEG_BIN = ffmpeg;

  await ensure(`${API}/api/health`, "cd backend && .venv/bin/uvicorn app.main:app --port 8000", "backend");
  await ensure(`${APP}/`, "cd frontend && npm run dev -- --port 5173 --strictPort", "vite dev");

  const account = await heroAccount();
  fs.rmSync(RECORDING_DIR, { recursive: true, force: true });
  fs.mkdirSync(RECORDING_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RECORDING_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("icmbot.analytics.consent", "denied");
    } catch {
      // storage may be unavailable before the origin is fixed
    }
    if (!window.__webmcp) window.__webmcp = {};
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool(tool) { window.__webmcp[tool.name] = tool; } },
    });
  });

  const videoStart = Date.now();
  await page.goto(`${APP}/#/`);
  const now = () => Math.max(0, (Date.now() - videoStart) / 1000);
  const captions = [];
  const mark = (text, seconds) => captions.push({ text, start: now(), end: now() + seconds });

  await page.waitForSelector('[data-testid="landing-page"]');
  await sleep(4600);
  mark("PLAY 9-HANDED TOURNAMENTS AGAINST 8 BOTS", 3.5);

  await page.evaluate(() => document.getElementById("lp-quiz")?.scrollIntoView({ behavior: "smooth" }));
  await sleep(1700);
  await page.getByTestId("landing-quiz-call").click();
  await page.waitForSelector('[data-testid="landing-quiz-answer"]');
  mark("TRY ONE SPOT: WHAT WOULD THE COACH DO?", 3.5);
  await sleep(5200);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1500);
  const login = page.getByTestId("landing-login");
  await login.hover();
  await sleep(500);
  await login.click();
  await page.waitForSelector('[data-testid="username-input"]');
  await page.getByTestId("username-input").fill(account.username);
  await page.getByTestId("password-input").fill(account.password);
  mark("SIGN IN: PRACTICE ONLY, NO REAL MONEY", 2.5);
  await sleep(1100);
  await page.getByTestId("auth-submit").click();
  await page.waitForSelector('[data-testid="session-bar"]', { timeout: 20_000 });
  await sleep(2200);

  await page.getByTestId("start-practice").click();
  await page.waitForSelector('[data-testid="opponent-choice-page"]');
  await sleep(1100);
  await page.getByTestId("opponents-choose").click();
  await page.waitForSelector('[data-testid="bot-profiles-page"]');
  await sleep(1000);
  mark("FILL THE TABLE WITH EIGHT PLAYING STYLES", 3);
  for (const profile of ["alex", "sarah", "david", "emma"]) {
    for (let i = 0; i < 2; i++) {
      await page.getByTestId(`bot-profile-add-${profile}`).click();
      await sleep(220);
    }
  }
  await page.screenshot({ path: `${RECORDING_DIR}/choose-opponents.png` });
  await sleep(900);
  await page.getByTestId("add-bots-to-table").click();
  await page.waitForSelector('[data-testid="table-page"]', { timeout: 40_000 });
  await sleep(1600);

  for (let i = 0; i < HAND_COUNT; i++) {
    if (i === 1) {
      mark("EVERY DECISION: THE COACH EXPLAINS WHY", 2.5);
    }
    // The last hand stays on its review so the camera can show it.
    await playHand(page, i === HAND_COUNT - 1);
    await sleep(1800);
  }

  // The last hand's review is up; the sidebar only renders between hands,
  // so capture the review, then advance once and pan the sidebar
  // (its default view already shows OVERALL PERFORMANCE).
  mark("HAND REVIEW: HISTORY + YOUR OVERALL PERFORMANCE", 4.5);
  await sleep(3800);
  // Advance so the sidebar renders again; retry once if the first call races
  // the auto-next countdown.
  for (let attempt = 0; attempt < 2; attempt++) {
    console.log("advancing to the sidebar hand:", JSON.stringify({
      phase: (await gameState(page))?.phase,
      hand: (await gameState(page))?.tournament?.handNumber,
    }));
    const result = await callTool(page, "next_hand");
    if (JSON.stringify(result).includes("ok")) {
      break;
    }
    await sleep(1500);
  }
  await waitFor(page, (s) => s && s.phase === "playing", 30_000, "a hand for the sidebar");
  await sleep(2000);
  await page.screenshot({ path: `${RECORDING_DIR}/analysis.png` });
  await sleep(3200);

  const tableId = (await gameState(page))?.table?.id ?? "";
  await page.goto(`${APP}/#/table/${tableId}?testWinner=true&testWinnerName=Hero`);
  await page.waitForSelector('[data-testid="tournament-winner"]', { timeout: 30_000 });
  mark("PLAY YOUR FIRST TOURNAMENT TODAY", 3.5);
  await sleep(2000);
  await page.getByTestId("tournament-new-session").click();
  await page.waitForSelector('[data-testid="table-page"]', { timeout: 40_000 });
  mark("CHAMPION: ONE WINNER PER TABLE", 3);
  await sleep(2600);

  const captionsFile = `${RECORDING_DIR}/captions.json`;
  fs.writeFileSync(captionsFile, JSON.stringify({ captions, duration: now() }, null, 1));
  await context.close();
  await browser.close();

  // Render the caption overlays as transparent PNGs with a separate,
  // unrecorded browser (the static ffmpeg build has no drawtext filter).
  const captionBrowser = await chromium.launch();
  const captionDir = `${RECORDING_DIR}/captions`;
  fs.mkdirSync(captionDir, { recursive: true });
  const escapeHtml = (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const [i, c] of captions.entries()) {
    const capPage = await captionBrowser.newPage({ viewport: { width: 1920, height: 140 } });
    await capPage.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}
      .cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font:700 44px "DejaVu Sans",sans-serif;color:#fff;white-space:nowrap;
      background:rgba(0,0,0,0.55);border-radius:12px;padding:12px 26px;}</style>
      <div class="cap">${escapeHtml(c.text)}</div>`);
    await capPage.screenshot({ path: `${captionDir}/cap-${String(i).padStart(2, "0")}.png`, omitBackground: true });
    await capPage.close();
  }
  await captionBrowser.close();

  const mp4 = new URL("../../frontend/public/videos/ICMBOT_promo.mp4", HERE).pathname;
  const poster = new URL("../../frontend/public/videos/ICMBOT_promo_poster.webp", HERE).pathname;
  process.env.RECORDING_DIR = RECORDING_DIR;
  const encode = spawn("bash", ["-lc", `node ${new URL("encode.mjs", HERE).pathname} "${RECORDING_DIR}" "${mp4}" "${poster}"`], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: process.env,
  });
  encode.on("exit", (code) => {
    for (const proc of started) proc.kill("SIGTERM");
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  for (const proc of started) proc.kill("SIGTERM");
  process.exit(1);
});
