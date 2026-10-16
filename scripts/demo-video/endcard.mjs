// Renders the end card: the video poster at 1920x1080. The owner asked for no
// "AI-generated voice" note (plan 082); that note was for OpenAI's voices,
// and the video uses an ElevenLabs voice. A "note" in the scenes file still
// draws one in the corner.
// Usage (from the repo root): node scripts/demo-video/endcard.mjs SCENES_JSON OUT_PNG
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const [specPath, out] = process.argv.slice(2);
const { endCard } = JSON.parse(readFileSync(specPath, "utf8"));
const poster = readFileSync(resolve(endCard.image)).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.setContent(`<!doctype html><html><body style="margin:0">
  <div style="position:relative;width:1920px;height:1080px;background:#07080a url(data:image/png;base64,${poster}) center/cover no-repeat">
    <span style="position:absolute;right:36px;bottom:28px;font:500 22px system-ui,sans-serif;color:rgba(255,255,255,0.6)">${endCard.note ?? ""}</span>
  </div></body></html>`);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
