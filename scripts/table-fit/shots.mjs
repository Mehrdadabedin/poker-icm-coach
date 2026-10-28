// Screenshots of the table for the owner: node scripts/table-fit/shots.mjs [outDir]
import fs from "node:fs";
import { account, chromium, openTable } from "./lib.mjs";

const out = process.argv[2] ?? "/tmp/fit";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const auth = await account();
const sizes = JSON.parse(process.env.FIT_SIZES ?? "[[1280,650],[1440,900]]");
for (const theme of ["dark", "light"]) {
  for (const [width, height] of sizes) {
    const { context, page } = await openTable(browser, auth, { width, height, theme, lang: process.env.FIT_LANG ?? "en" });
    const name = `${out}/${width}x${height}-${theme}`;
    await page.screenshot({ path: `${name}-closed.png` });
    await page.getByTestId("details-btn").click();
    await page.screenshot({ path: `${name}-info.png` });
    await page.getByTestId("details-btn").click();
    await page.getByTestId("history-chip").click();
    await page.screenshot({ path: `${name}-history.png` });
    await context.close();
  }
}
await browser.close();
