/**
 * record.mjs — reproduce the narrated ICMBOT promo video (A48).
 *
 * The images are the REAL app: backend + vite dev are started when down, a
 * "Hero" demo account comes from the API (random password, stored only in
 * the gitignored .venv/hero-credentials.json), and the game is driven ONLY
 * through the page's WebMCP tools (a stand-in document.modelContext before
 * load collects them on window.__webmcp). The coach panel recommendation is
 * followed every turn.
 *
 * The TIMELINE is narration-driven (scripts/record-promo/narration.json):
 * piper-tts synthesizes the female voice lines, each scene is held open at
 * least as long as its line (+0.5s), and the scene marks measured here are
 * written to captions.json so encode.mjs can place the captions and the
 * audio exactly on those marks (one cue at a time, never overlapping).
 *
 * Run from the frontend:  npm run record:promo
 * Setup (once): see README.md (imageio-ffmpeg + piper-tts venv).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const HERE = new URL(".", import.meta.url);
const ROOT_DIR = new URL("../../", import.meta.url).pathname;
const VENV = new URL(".venv/", import.meta.url).pathname;
const require = createRequire(new URL("../../frontend/node_modules/_probe.cjs", import.meta.url));
const { chromium } = require("playwright");

const API = process.env.ICMBOT_API_URL ?? "http://localhost:8000";
const APP = process.env.ICMBOT_APP_URL ?? "http://localhost:5173";
const HAND_COUNT = 4;
const RECORDING_DIR = process.env.PROMO_DIR ?? "/tmp/icmbot-promo";
const NARRATION = JSON.parse(fs.readFileSync(new URL("narration.json", import.meta.url).pathname, "utf8"));

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

async function run(command) {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", (b) => { err += b; });
    child.on("exit", (code) => resolve({ code: code ?? 0, out, err }));
  });
}
async function findFfmpeg() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  const py = new URL(".venv/bin/python", import.meta.url).pathname;
  const probe = await run(`${py} -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'`);
  if (probe.out.trim() && fs.existsSync(probe.out.trim())) return probe.out.trim();
  throw new Error("ffmpeg not found: run the record-promo venv setup (scripts/record-promo/README.md).");
}
async function ensurePiperVoice() {
  const py = new URL(".venv/bin/python", import.meta.url).pathname;
  const voices = new URL(".venv/voices", import.meta.url).pathname;
  fs.mkdirSync(voices, { recursive: true });
  const folderFor = (name) => (name.includes("hfc") ? "hfc_female" : "amy");
  for (const name of [NARRATION.voice, NARRATION.voiceFallback]) {
    const model = `${voices}/${name}.onnx`;
    if (!fs.existsSync(model)) {
      const base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US";
      const dl = await run(
        `cd ${voices} && curl -fsSL -o ${name}.onnx "${base}/${folderFor(name)}/medium/${name}.onnx" ` +
        `&& curl -fsSL -o ${name}.onnx.json "${base}/${folderFor(name)}/medium/${name}.onnx.json"`,
      );
      if (dl.code !== 0 || !fs.existsSync(model)) continue;
    }
    const check = `${RECORDING_DIR}/voice-check.wav`;
    const res = await run(`${py} -m piper -m "${model}" -f "${check}" -- "voice check"`);
    if (res.code === 0 && fs.existsSync(check)) {
      fs.rmSync(check, { force: true });
      return name;
    }
  }
  throw new Error("piper voice synthesis failed (hfc_female and amy-medium unavailable)");
}
async function synthLines(voice) {
  const dir = `${RECORDING_DIR}/narration`;
  fs.mkdirSync(dir, { recursive: true });
  const py = new URL(".venv/bin/python", import.meta.url).pathname;
  const voices = new URL(".venv/voices", import.meta.url).pathname;
  const result = [];
  for (const scene of NARRATION.scenes) {
    const wav = `${dir}/${scene.id}.wav`;
    if (!fs.existsSync(wav)) {
      const res = await run(`${py} -m piper -m ${voices}/${voice}.onnx -c ${voices}/${voice}.onnx.json -f ${wav} ${JSON.stringify(scene.line)}`);
      if (res.code !== 0) throw new Error(`piper failed for ${scene.id}: ${res.err.slice(-300)}`);
    }
    const probe = await run(`"${process.env.FFMPEG_BIN}" -i ${wav} 2>&1 | grep -oE "Duration: [0-9:.]+"`);
    const m = probe.out.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    const dur = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 3;
    result.push({ ...scene, wav, dur });
  }
  return result;
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
    const text = await page.locator(".coach-panel .coach-recommendation").textContent({ timeout: 1500 }).catch(() => "");
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

async function heroAccount() {
  const credsFile = new URL(".venv/hero-credentials.json", import.meta.url).pathname;
  const readCreds = () => {
    try { return JSON.parse(fs.readFileSync(credsFile, "utf8")); } catch { return null; }
  };
  const sign = async (path, password) => {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Hero", password }),
    });
    return res.ok ? res.json() : null;
  };
  const password = crypto.randomBytes(9).toString("base64url");
  if (await sign("/api/auth/register", password)) {
    fs.writeFileSync(credsFile, JSON.stringify({ username: "Hero", password }));
    return { username: "Hero", password };
  }
  const stored = readCreds();
  if (stored && (await sign("/api/auth/login", stored.password))) return stored;
  throw new Error("an existing Hero account blocks the recording: stop the backend, delete backend/data/users.json, and retry.");
}

async function main() {
  process.env.FFMPEG_BIN = await findFfmpeg();
  fs.rmSync(RECORDING_DIR, { recursive: true, force: true });
  fs.mkdirSync(RECORDING_DIR, { recursive: true });
  const voice = await ensurePiperVoice();
  const lines = await synthLines(voice);

  await ensure(`${API}/api/health`, "cd backend && .venv/bin/uvicorn app.main:app --port 8000", "backend");
  await ensure(`${APP}/`, "cd frontend && npm run dev -- --port 5173 --strictPort", "vite dev");
  const account = await heroAccount();

  const browser = await chromium.launch();
  // 1280x720 CSS viewport at deviceScaleFactor 1.5 -> a crisp 1920x1080 image.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1.5,
    recordVideo: { dir: RECORDING_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem("icmbot.analytics.consent", "denied"); } catch {}
    if (!window.__webmcp) window.__webmcp = {};
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool(tool) { window.__webmcp[tool.name] = tool; } },
    });
  });

  // ---- narration schedule: every scene held at least line + 0.5s ----
  const marks = {}; // seconds relative to the hero-content mark
  let markBase = 0;
  const relNow = () => (Date.now() - markBase) / 1000;
  const mark = (id) => { marks[id] = relNow(); };
  const sceneLen = (id) => (lines.find((l) => l.id === id)?.dur ?? 3) + 0.5;
  async function holdUntil(seconds) {
    const rest = (seconds - relNow()) * 1000;
    if (rest > 0) await sleep(rest);
  }

  await page.goto(`${APP}/#/`);
  await page.waitForSelector('[data-testid="landing-page"]');
  markBase = Date.now();
  mark("hero");
  await sleep(1400);
  await holdUntil(marks.hero + sceneLen("hero") + 1.0);

  // Quiz: scroll straight from the hero, never returning to it.
  await page.evaluate(() => document.getElementById("lp-quiz")?.scrollIntoView({ behavior: "smooth" }));
  await sleep(1500);
  await page.getByTestId("landing-quiz-call").click();
  await page.waitForSelector('[data-testid="landing-quiz-answer"]');
  mark("quiz");
  await sleep(900);
  await holdUntil(marks.quiz + sceneLen("quiz"));

  // Login straight from the quiz (sticky header), no scene back to the hero.
  await page.getByTestId("landing-login").click();
  await page.waitForSelector('[data-testid="username-input"]');
  await page.getByTestId("username-input").fill(account.username);
  await page.getByTestId("password-input").fill(account.password);
  await page.getByTestId("auth-submit").click();
  await page.waitForSelector('[data-testid="session-bar"]', { timeout: 20_000 });
  await sleep(1800);

  await page.getByTestId("start-practice").click();
  await page.waitForSelector('[data-testid="opponent-choice-page"]');
  await page.getByTestId("opponents-choose").click();
  await page.waitForSelector('[data-testid="bot-profiles-page"]');
  mark("opponents");
  for (const profile of ["alex", "sarah", "david", "emma"]) {
    for (let i = 0; i < 2; i++) {
      await page.getByTestId(`bot-profile-add-${profile}`).click();
      await sleep(180);
    }
  }
  await holdUntil(marks.opponents + sceneLen("opponents") + 1.2);
  await page.getByTestId("add-bots-to-table").click();
  await page.waitForSelector('[data-testid="table-page"]', { timeout: 40_000 });
  await sleep(1300);

  // Hands: mark at the first live hand; keep playing up to ~4 hands.
  await waitFor(page, (s) => s && s.phase === "playing" && s.tournament.handNumber > 0, 60_000, "a live hand");
  mark("hands");
  async function playHand(final = false) {
    let acted = 0;
    while (acted < 6) {
      const current = await gameState(page);
      if (!current) { await sleep(400); continue; }
      if (current.phase === "handOver") {
        await callTool(page, "pause_game");
        await sleep(2400);
        if (!final) await callTool(page, "next_hand");
        return;
      }
      if (current.waitingForHero) {
        const rec = await coachRecommendation(page);
        const action = actionFor(rec, current) ?? fallbackAction(current);
        if (action) { await callTool(page, action.name, action.input); acted += 1; }
        await sleep(1600);
        continue;
      }
      await sleep(400);
    }
    await waitFor(page, (s) => s && s.phase === "handOver", 60_000, "hand completion");
    await callTool(page, "pause_game");
    await sleep(1400);
    if (!final) await callTool(page, "next_hand");
  }
  for (let i = 0; i < HAND_COUNT; i++) {
    await playHand(i === HAND_COUNT - 1);
    await sleep(1700);
  }

  // Review + sidebar performance.
  await waitFor(page, (s) => s && s.phase === "handOver", 60_000, "final review");
  mark("review");
  await callTool(page, "pause_game");
  await holdUntil(marks.review + sceneLen("review") + 0.8);
  await callTool(page, "next_hand");
  await waitFor(page, (s) => s && s.phase === "playing", 30_000, "a hand for the sidebar");
  await sleep(2000);
  await page.screenshot({ path: `${RECORDING_DIR}/analysis.png` });
  await holdUntil(marks.review + sceneLen("review") + 4.4);

  // Champion.
  const tableId = (await gameState(page))?.table?.id ?? "";
  await page.goto(`${APP}/#/table/${tableId}?testWinner=true&testWinnerName=Hero`);
  await page.waitForSelector('[data-testid="tournament-winner"]', { timeout: 30_000 });
  mark("champion");
  await sleep(1500);
  await page.getByTestId("tournament-new-session").click();
  await page.waitForSelector('[data-testid="table-page"]', { timeout: 40_000 });
  await sleep(1200);
  await holdUntil(marks.champion + sceneLen("champion") + 3.2);

  const videoEnd = relNow();
  fs.writeFileSync(`${RECORDING_DIR}/marks.json`, JSON.stringify({
    marks, lines, voice, videoEnd,
  }, null, 1));
  await context.close();
  await browser.close();

  // Render caption overlays (one per narration line) as transparent PNGs.
  const captionBrowser = await chromium.launch();
  const captionDir = `${RECORDING_DIR}/captions`;
  fs.mkdirSync(captionDir, { recursive: true });
  const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const [i, line] of lines.entries()) {
    const capPage = await captionBrowser.newPage({ viewport: { width: 1920, height: 140 } });
    await capPage.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}
      .cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      font:700 44px "DejaVu Sans",sans-serif;color:#fff;white-space:nowrap;
      background:rgba(0,0,0,0.55);border-radius:12px;padding:12px 26px;}</style>
      <div class="cap">${escapeHtml(line.line)}</div>`);
    await capPage.screenshot({ path: `${captionDir}/cap-${String(i).padStart(2, "0")}.png`, omitBackground: true });
    await capPage.close();
  }
  await captionBrowser.close();

  const mp4 = new URL("../../frontend/public/videos/ICMBOT_promo.mp4", import.meta.url).pathname;
  const poster = new URL("../../frontend/public/videos/ICMBOT_promo_poster.webp", import.meta.url).pathname;
  const encode = spawn("bash", ["-lc", `node ${new URL("encode.mjs", import.meta.url).pathname} "${RECORDING_DIR}" "${mp4}" "${poster}"`], {
    cwd: ROOT_DIR, stdio: "inherit", env: process.env,
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
