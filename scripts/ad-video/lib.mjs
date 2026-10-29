// Shared recorder for the vertical ad (plan 098): a phone-sized page captured
// frame by frame at 1080x1920. Playwright's video option does not scale a page
// with deviceScaleFactor (it writes the 390 px page into a grey 1080 px frame),
// so frames come from Page.captureScreenshot and are joined by assemble_ad.py.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium, request } = require("@playwright/test");

const SITE = process.env.SITE ?? "http://localhost:5175";
const API = process.env.API ?? "http://localhost:8766";
const USER = process.env.DEMO_USER ?? "demoplayer";
// CSS 432x768 at 2.5x is exactly 1080x1920 and is still the upright phone layout. Under 700 px
// tall the felt shrinks (useFeltFit, plan 106 follow-ups), so the old 390x693 is a short phone.
const VIEW = { width: 432, height: 768 };
const SCALE = 2.5;

// What must never be in a shot: a lock, an Upgrade card or sheet, the locked coach chip (the
// account is Pro, not admin), and a seat behind the bet buttons.
const LOCKS = ".coach-chip, .locked-line, .hm-lock-pro, .ico-lock, .hm-card-upgrade, .pro-locked-page, .coach-chip-unlock, [data-testid=upgrade-sheet]";
const flaws = () => {
  const found = [...document.querySelectorAll(LOCKS_SELECTOR)].filter((n) => n.offsetParent).map((n) => `visible ${n.className || n.dataset.testid}`);
  const controls = document.querySelector(".hero-controls");
  if (controls) {
    const top = controls.getBoundingClientRect().top;
    const low = Math.max(...[...document.querySelectorAll(".seat")].map((s) => s.getBoundingClientRect().bottom));
    if (low > top + 1) found.push(`a seat sits ${Math.round(low - top)}px behind the bet buttons`);
  }
  return found;
};

// a ring where a finger touches, so a viewer sees the tap (recording only)
const TAP_DOT = () => document.addEventListener("pointerdown", (e) => {
  const d = document.createElement("div");
  d.style.cssText = `position:fixed;z-index:99999;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #ffd54a;background:rgba(255,213,74,.28);left:${e.clientX}px;top:${e.clientY}px;transition:transform .45s,opacity .45s`;
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = "scale(1.9)"; d.style.opacity = "0"; });
  setTimeout(() => d.remove(), 500);
}, true);

export async function openTake(out, passFile) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(`${out}/frames`, { recursive: true });
  const password = readFileSync(passFile, "utf8").trim();
  const api = await request.newContext({ baseURL: API });
  let res = await api.post("/api/auth/register", { data: { username: USER, password } });
  if (!res.ok()) res = await api.post("/api/auth/login", { data: { username: USER, password } });
  if (!res.ok()) throw new Error(`auth failed: ${res.status()}`);
  const token = (await res.json()).token;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem("icmbot.analytics.consent", "denied"));
  await context.addInitScript(TAP_DOT);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const t0 = Date.now();
  const stamps = [];
  const marks = [];
  const problems = [];
  const checks = [];
  let running = false;
  let grab = Promise.resolve();
  const shot = async () => {
    let timer;
    const limit = new Promise((_, no) => { timer = setTimeout(() => no(new Error("screenshot timed out")), 5000); });
    try { return await Promise.race([cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 88 }), limit]); }
    finally { clearTimeout(timer); }
  };
  // not on about:blank: the first screenshot there never returns
  const startCapture = () => {
    if (running) return;
    running = true;
    grab = (async () => {
      let failed = 0;
      while (running) {
        try {
          const { data } = await shot();
          failed = 0;
          const name = `${String(stamps.length).padStart(6, "0")}.jpg`;
          writeFileSync(`${out}/frames/${name}`, Buffer.from(data, "base64"));
          stamps.push([name, (Date.now() - t0) / 1000]);
        } catch (error) {
          failed += 1;
          console.error(String(error));
          if (failed >= 3) { console.error("3 screenshots failed in a row: stopping the take"); process.exit(1); }
        }
      }
    })();
  };
  const t = {
    page, api, token, startCapture, user: USER, out, password,
    pause: (ms) => page.waitForTimeout(ms),
    tid: (id) => page.locator(`[data-testid="${id}"]`),
    mark: (name) => {
      marks.push({ name, t: (Date.now() - t0) / 1000 }); console.log(marks.at(-1));
      checks.push(page.evaluate(`(${flaws.toString().replace("LOCKS_SELECTOR", JSON.stringify(LOCKS))})()`)
        .then((found) => found.forEach((f) => problems.push(`${name}: ${f}`)), () => undefined));
    },
    tap: async (loc) => { await loc.scrollIntoViewIfNeeded({ timeout: 5000 }); await loc.tap({ timeout: 5000 }); },
    async server(path, method = "GET") {
      const tableId = page.url().split("/table/")[1]?.split(/[?#/]/)[0];
      const r = await api.fetch(`/api/game/${tableId}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok()) throw new Error(`${path} failed: ${r.status()}`);
      return r.json();
    },
    async settings(data) {
      const r = await api.put("/api/settings", { data, headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok()) throw new Error(`settings failed: ${r.status()}`);
    },
    async finish() {
      running = false;
      await Promise.race([grab, new Promise((done) => setTimeout(done, 10000))]);
      await Promise.all(checks);
      writeFileSync(`${out}/marks.json`, JSON.stringify(marks, null, 2));
      for (const p of problems) console.error(`PROBLEM ${p}`);
      if (problems.length) process.exitCode = 1;
      writeFileSync(`${out}/frames.json`, JSON.stringify(stamps));
      await browser.close();
      await api.dispose();
    },
  };
  return t;
}

export async function signIn(t, capture = true) {
  await t.page.goto(`${SITE}/?lang=en#/`);
  if (capture) t.startCapture();
  await t.page.evaluate(([tok, user]) => { localStorage.setItem("icm_auth_token", tok); localStorage.setItem("icm_username", user); }, [t.token, t.user]);
  await t.page.goto(`${SITE}/?lang=en#/login`);
  await t.tid("start-practice").waitFor();
}

export async function startTable(t) {
  await t.tap(t.tid("start-practice"));
  for (const id of ["alex", "sarah", "david", "emma"]) {
    for (let i = 0; i < 2; i += 1) {
      const add = t.tid(`bot-profile-add-${id}`);
      if (await add.isEnabled()) { await add.click(); await t.pause(60); } // the lineup is kept between tables
    }
  }
  await t.tap(t.tid("add-bots-to-table"));
  await t.page.locator(".hero-controls, [data-testid=next-hand-btn]").first().waitFor({ timeout: 30000 });
}
