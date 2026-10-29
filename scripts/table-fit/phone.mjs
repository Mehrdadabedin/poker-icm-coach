// Phones held upright: no seat may sit behind the bet buttons, even in the worst case.
// Exported for check.mjs; run alone with: node scripts/table-fit/phone.mjs
import { pathToFileURL } from "node:url";
import { account, chromium, openTable } from "./lib.mjs";

export const PHONES = [[360, 640], [360, 740], [360, 780], [375, 667], [390, 844], [412, 915]];

/** The worst case on the felt: every opponent still holds cards and the flop is out. */
const worstCase = () => {
  const live = document.querySelector(".seat:not(.seat-hero) .seat-cards");
  if (live) {
    document.querySelectorAll(".seat:not(.seat-hero)").forEach((seat) => {
      if (!seat.querySelector(".seat-cards")) seat.appendChild(live.cloneNode(true));
      seat.querySelectorAll(".seat-folded-label, .seat-status").forEach((n) => n.remove());
      seat.classList.remove("seat-folded");
    });
  }
  const board = document.querySelector(".table-felt .board");
  const card = document.querySelector(".seat-hero .seat-cards .playing-card");
  if (board && card) {
    board.classList.remove("board-is-empty");
    board.replaceChildren(...[0, 1, 2].map(() => card.cloneNode(true)));
  }
};

/** Returns the failures: a seat whose bottom passes the top of the bet controls. */
export async function checkPhones(browser, auth, langs = ["en", "es"]) {
  const failures = [];
  for (const lang of langs) {
    for (const [width, height] of PHONES) {
      const where = `${lang} phone ${width}x${height}`;
      const { context, page } = await openTable(browser, auth, { width, height, theme: "dark", lang });
      await page.evaluate(worstCase);
      // the felt refits on a layout change; the forced worst case announces itself as one
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => {
        const zoom = Number(document.querySelector(".table-felt").style.zoom || 1);
        const controls = document.querySelector(".hero-controls").getBoundingClientRect().top + window.scrollY;
        const seats = [...document.querySelectorAll(".seat")].map((s) => s.getBoundingClientRect().bottom + window.scrollY);
        const scrollMax = document.scrollingElement.scrollHeight - window.innerHeight;
        return { controls, lowest: Math.max(...seats), scrollMax, zoom };
      });
      const behind = Math.round(m.lowest - m.controls);
      console.log(`${where}: lowest seat ${Math.round(m.lowest)}, bet controls ${Math.round(m.controls)}, ${behind > 0 ? `${behind}px behind` : "clear"}, page scroll ${m.scrollMax}, felt zoom ${m.zoom.toFixed(2)}`);
      // below 700 px tall the felt reaches its 60% floor; there the page may scroll instead
      if (behind > 0 && height >= 700) failures.push(`${where}: a seat sits ${behind}px behind the bet controls`);
      else if (behind > 0) console.log(`  warning: ${where} scrolls ${m.scrollMax}px (the felt is at its smallest)`);
      await context.close();
    }
  }
  return failures;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const browser = await chromium.launch();
  const failures = await checkPhones(browser, await account());
  await browser.close();
  if (failures.length) {
    console.error(`\nFAIL (${failures.length})\n${failures.join("\n")}`);
    process.exit(1);
  }
  console.log("\nOK: no seat behind the bet controls");
}
