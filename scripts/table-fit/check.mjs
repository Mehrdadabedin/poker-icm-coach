// Fails (exit 1) when the table does not fit its window (plan 106).
// Needs the backend and the dev server: see scripts/table-fit/README in the plan. Run: node scripts/table-fit/check.mjs
import { account, chromium, openTable } from "./lib.mjs";
import { checkPhones } from "./phone.mjs";

const WINDOWS = [[1280, 650], [1366, 768], [1440, 900]];
const WIDTHS = [360, 390, 768, 1024, 1280, 1600];
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);
const browser = await chromium.launch();
const auth = await account();

for (const lang of ["en", "es"]) for (const theme of ["dark", "light"]) {
  for (const [width, height] of WINDOWS) {
    const where = `${lang} ${theme} ${width}x${height}`;
    const { context, page } = await openTable(browser, auth, { width, height, theme, lang });
    const m = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, bottom: r.bottom, right: r.right }; };
      const pageEl = document.querySelector("[data-testid=table-page]");
      const parts = [".hero-controls", ".controls-row", ".bet-sizer", ".size-slider", "[data-testid=bet-amount]"];
      return {
        docScroll: document.scrollingElement.scrollHeight - window.innerHeight,
        pageScroll: pageEl.scrollHeight - pageEl.clientHeight,
        bet: parts.map((q) => [q, box(document.querySelector(q))]),
        buttons: [...document.querySelectorAll(".hero-controls .btn, .hero-controls .size-preset, .hero-controls .size-step")].map(box),
        w: window.innerWidth, h: window.innerHeight,
      };
    });
    if (m.docScroll > 0) fail(where, `the page scrolls by ${m.docScroll}px`);
    if (m.pageScroll > 0) fail(where, `the table page scrolls by ${m.pageScroll}px`);
    for (const [q, b] of [...m.bet, ...m.buttons.map((b) => ["a bet button", b])]) {
      if (b.top < 0 || b.left < 0 || b.bottom > m.h || b.right > m.w) fail(where, `${q} is outside the window (${JSON.stringify(b)})`);
    }
    const cut = await page.evaluate(() => [...document.querySelectorAll("button:not(.tbl-chip), .tbl-info")]
      .filter((n) => n.offsetParent && n.scrollWidth > n.clientWidth).map((n) => n.textContent.trim().slice(0, 30)));
    for (const c of cut) fail(where, `"${c}" is cut`);
    await page.getByTestId("history-chip").click();
    const open = await page.evaluate(() => {
      const panel = document.querySelector("[data-testid=history-drawer]").getBoundingClientRect();
      return { panel: panel.bottom, controls: document.querySelector(".hero-controls").getBoundingClientRect().top,
        tabs: [...document.querySelectorAll(".drawer-tab")].filter((n) => n.scrollWidth > n.clientWidth).length,
        tabCount: document.querySelectorAll(".drawer-tab").length };
    });
    if (open.panel > open.controls) fail(where, `the history panel (bottom ${open.panel}) reaches the bet controls (top ${open.controls})`);
    if (open.tabCount !== 3 || open.tabs) fail(where, "the three history tabs do not fit");
    console.log(`${where}: page scroll ${m.docScroll}/${m.pageScroll}, bet area bottom ${Math.round(m.bet[0][1].bottom)} of ${m.h}`);
    await context.close();
  }
}

// seats: one table, resized through the six widths. A 10-letter name stands in for the longest.
for (const lang of ["en", "es"]) for (const theme of ["dark", "light"]) {
const { context, page } = await openTable(browser, auth, { width: 1280, height: 800, theme, lang });
await page.evaluate(() => document.querySelectorAll(".seat:not(.seat-hero) .seat-name").forEach((el) => { el.textContent = "Bartholome"; }));
for (const width of WIDTHS) {
  const height = width < 500 ? 800 : width < 1000 ? 1024 : 800;
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(200);
  const seats = await page.evaluate(() => [...document.querySelectorAll(".seat")].map((el) => {
    const r = el.getBoundingClientRect();
    const cut = [...el.querySelectorAll(".seat-name, .seat-stack")].filter((n) => n.scrollWidth > n.clientWidth).map((n) => n.className);
    return { seat: el.dataset.seat, top: r.top, left: r.left, bottom: r.bottom, right: r.right, cut };
  }));
  const where = `${lang} ${theme} seats at ${width}px`;
  for (const s of seats) if (s.cut.length) fail(where, `seat ${s.seat} cuts ${s.cut.join(", ")}`);
  for (let i = 0; i < seats.length; i += 1) {
    for (let j = i + 1; j < seats.length; j += 1) {
      const a = seats[i], b = seats[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) fail(where, `seats ${a.seat} and ${b.seat} overlap`);
    }
  }
  console.log(`${where}: ${seats.length} seats checked`);
}
await context.close();
}
// phones held upright: no seat behind the bet controls, in the worst case
failures.push(...await checkPhones(browser, auth));
await browser.close();

if (failures.length) {
  console.error(`\nFAIL (${failures.length})\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("\nOK: the table fits");
