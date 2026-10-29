// Renders the text layers of the vertical ad as transparent 1080x1920 PNGs
// (this ffmpeg build has no drawtext): one per shot (words, PRO pill, address) and the end card.
// Usage: node scripts/ad-video/overlays.mjs SHOTS_JSON OUT_DIR
// Safe area (Meta, Instagram Reels ads, see NOTES.md): 14% clear at the top, 35% at the bottom and 6%
// on each side of 1080x1920. Everything drawn here must sit inside x 65..1015, y 269..1248; the script
// measures each element and exits 1 when one is outside.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const [specPath, out] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
mkdirSync(out, { recursive: true });
const logo = readFileSync(resolve("frontend/public/Logo/logo.png")).toString("base64");
const FONT = "'Liberation Sans', 'DejaVu Sans', sans-serif";
const SAFE = { left: 65, right: 1015, top: 269, bottom: 1248 };

// One dark panel inside the safe area, below the coach strip and the hero's seat (a seat ends about y 925): the PRO pill above
// the words, the address under them, all centred. y is the top of the panel.
const pop = (text, { hook, pro, y = hook ? 936 : 940 }, url) => `<div data-safe style="position:absolute;left:65px;right:65px;top:${y}px;
  padding:18px 20px 18px;box-sizing:border-box;border-radius:30px;background:rgba(6,8,12,.62);
  display:flex;flex-direction:column;align-items:center;gap:8px">
  <div style="font:900 30px/1.2 ${FONT};color:#241c05;letter-spacing:2px;background:#ffd54a;padding:3px 18px;
    border-radius:12px;visibility:${pro ? "visible" : "hidden"}">PRO</div>
  <div style="text-align:center;font:900 ${hook ? 80 : 78}px/1.04 ${FONT};color:#fff;letter-spacing:1px;text-transform:uppercase;
    -webkit-text-stroke:10px #0a0c10;paint-order:stroke fill;text-shadow:0 8px 28px rgba(0,0,0,.7)">${text}</div>
  <div style="font:700 34px/1.2 ${FONT};color:#fff;opacity:.9">${url}</div></div>`;
const endCard = ({ line, tag: head, button }) => `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,#1b2230,#07080a 70%)">
  <img src="data:image/png;base64,${logo}" style="position:absolute;left:90px;width:900px;top:430px">
  <div data-safe style="position:absolute;left:65px;right:65px;top:790px;text-align:center;font:900 96px ${FONT};color:#ffd54a">${head}</div>
  <div data-safe style="position:absolute;left:80px;right:80px;top:930px;text-align:center;font:500 46px/1.25 ${FONT};color:#e8ecf2">${line}</div>
  <div data-safe style="position:absolute;left:210px;right:210px;top:1100px;text-align:center;font:800 62px ${FONT};color:#10131a;background:#ffd54a;border-radius:22px;padding:26px 0;box-shadow:0 10px 30px rgba(255,213,74,.35)">${button}</div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
let outside = 0;
async function render(name, body, transparent = true) {
  await page.setContent(`<!doctype html><body style="margin:0;width:1080px;height:1920px;position:relative;overflow:hidden;background:transparent">${body}</body>`);
  const boxes = await page.evaluate(() => [...document.querySelectorAll("[data-safe]")].map((n) => {
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
    const own = n.getBoundingClientRect();
    return { left: Math.max(b.left, own.left), right: Math.min(b.right, own.right), top: own.top, bottom: own.bottom };
  }));
  for (const b of boxes) {
    if (b.left < SAFE.left - 1 || b.right > SAFE.right + 1 || b.top < SAFE.top - 1 || b.bottom > SAFE.bottom + 1) {
      console.error(`OUTSIDE the safe area: ${name} ${JSON.stringify(b)}`); outside += 1;
    }
  }
  await page.screenshot({ path: `${out}/${name}.png`, omitBackground: transparent });
}
for (const [i, shot] of spec.shots.entries()) await render(`pop${String(i).padStart(2, "0")}`, pop(shot.text, shot, spec.url));
await render("end", endCard(spec.end), false);
await browser.close();
if (outside) process.exit(1);
