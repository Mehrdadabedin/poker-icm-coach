// Lays the screenshots from capture.mjs into the link preview cards and the
// landing hero pictures (plan 104). See README.md.
// Usage (repo root): node scripts/og-image/render.mjs SHOTS_DIR [CHECK_DIR]
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(new URL("../../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const SHOTS = resolve(process.argv[2]);
const CHECK = process.argv[3] && resolve(process.argv[3]);
const IMAGES = new URL("../../frontend/public/images/", import.meta.url).pathname;
const HERE = new URL(".", import.meta.url).pathname;
const MAX_HERO_BYTES = 250_000;
if (CHECK) mkdirSync(CHECK, { recursive: true });

const browser = await chromium.launch();
const url = (page, lang) => {
  const shot = (name) => encodeURIComponent(pathToFileURL(`${SHOTS}/${name}-${lang}.png`).href);
  const query = `lang=${lang}&phone=${shot("phone")}&wide=${shot("wide")}`;
  return pathToFileURL(`${HERE}${page}.html`).href + `?${query}`;
}
// one render at a scale; the check copies are the same page, shrunk
async function open(page, lang, w, h, scale = 1) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const tab = await context.newPage();
  await tab.goto(url(page, lang));
  await tab.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
  await tab.evaluate(() => document.fonts.ready);
  return { tab, close: () => context.close() };
}
// WebP through the browser's own encoder, so no image library is needed
async function webp(png, quality) {
  const tab = await (await browser.newContext()).newPage();
  const b64 = await tab.evaluate(async ([data, q]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    canvas.getContext("2d").drawImage(img, 0, 0);
    const blob = await new Promise((done) => canvas.toBlob(done, "image/webp", q));
    return btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
  }, [png.toString("base64"), quality]);
  return Buffer.from(b64, "base64");
}

for (const lang of ["en", "es"]) {
  const suffix = lang === "es" ? "-es" : "";
  const card = await open("preview", lang, 1200, 630);
  const jpg = await card.tab.screenshot({ type: "jpeg", quality: 85 });
  writeFileSync(`${IMAGES}og-app-1200x630${suffix}.jpg`, jpg);
  await card.close();

  const heroPage = await open("hero", lang, 1602, 982);
  const png = await heroPage.tab.screenshot({ type: "png" });
  await heroPage.close();
  let quality = 0.9, out = await webp(png, quality);
  while (out.length > MAX_HERO_BYTES && quality > 0.3) { quality -= 0.05; out = await webp(png, quality); }
  writeFileSync(`${IMAGES}hero-app${suffix}.webp`, out);
  console.log(`${lang}: card ${jpg.length} bytes, hero ${out.length} bytes (quality ${quality.toFixed(2)})`);

  if (!CHECK) continue;
  // how they read in a chat (500 px wide) and in WhatsApp's small preview (centre square, 300 px)
  const small = await open("preview", lang, 1200, 630, 500 / 1200);
  writeFileSync(`${CHECK}/og-app${suffix}-500.png`, await small.tab.screenshot());
  await small.close();
  const crop = await open("preview", lang, 1200, 630, 300 / 630);
  writeFileSync(`${CHECK}/og-app${suffix}-crop-300.png`,
    await crop.tab.screenshot({ clip: { x: 285, y: 0, width: 630, height: 630 } }));
  await crop.close();
  const heroSmall = await open("hero", lang, 1602, 982, 500 / 1602);
  writeFileSync(`${CHECK}/hero-app${suffix}-500.png`, await heroSmall.tab.screenshot());
  await heroSmall.close();
}
await browser.close();
