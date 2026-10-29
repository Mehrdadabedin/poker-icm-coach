// Records one take for the vertical ad (plan 098).
// Usage: DEAL_SEED=... node scripts/ad-video/takes.mjs NAME OUT_DIR PASSWORD_FILE
// The backend must run with the DEAL_SEED named in README.md for that take.
import { openTake, signIn, startTable } from "./lib.mjs";
import { advice, heroTurnOrOver, nextHand, playUntil, tapRaiseSize, wants, act } from "./play.mjs";

const [NAME, OUT, PASS_FILE] = process.argv.slice(2);
const DEFAULTS = { startingStack: 45000, startingSmallBlind: 100, startingBigBlind: 100, blindLevelMinutes: 20 };
const SHORT = { startingStack: 2000, startingSmallBlind: 100, startingBigBlind: 200, blindLevelMinutes: 600 };
const t = await openTake(OUT, PASS_FILE);

const TAKES = {
  // hand 1: 8h Qs in the CO, a glossary tap, the fold graded, then a raise
  async co() {
    await t.settings(DEFAULTS);
    await signIn(t); await startTable(t); await heroTurnOrOver(t);
    await t.tid("strip-action").waitFor({ timeout: 10000 });
    t.mark("dealt"); await t.pause(1500);
    t.mark("coach"); await t.pause(700);
    await t.tap(t.tid("strip-why")); t.mark("sheet"); await t.pause(1500);
    await t.page.keyboard.press("Escape"); await t.pause(400);
    await t.tap(t.tid("coach-strip").locator('[data-testid="gl-term-CO"]')); t.mark("gloss"); await t.pause(1900);
    await t.page.keyboard.press("Escape");
    await t.pause(300);
    t.mark("fold"); await act(t, "FOLD");
    await t.tap(t.tid("review-hand-btn"));
    const preferred = t.page.getByText("PREFERRED").first();
    await preferred.waitFor({ timeout: 10000 });
    // near the top of the screen: the text panel covers the lower half
    await preferred.evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -170); });
    t.mark("grade"); await t.pause(1700);
    await t.tap(t.page.getByRole("button", { name: "BACK TO TABLE" }));
    const a = await playUntil(t, (x) => wants(x) === "RAISE" && x.street === "preflop");
    if (!a) throw new Error("no raise spot");
    t.mark("raise-turn"); await t.pause(1300);
    await tapRaiseSize(t); t.mark("raise-pick"); await t.pause(1200);
    await act(t, "RAISE"); t.mark("raise-done"); await t.pause(1500);
  },
  // 10 BB stacks: the SB push/fold spot, then the ICM all-in call spot
  // fast blinds and 10 BB stacks: play to the champion screen, marking the bubble and the final table
  async champion() {
    await t.settings({ ...SHORT, blindLevelMinutes: 2 });
    await signIn(t);
    const seen = new Set();
    const note = async (a) => {
      const stage = { BUBBLE: "bubble", "FINAL TABLE": "final" }[String(a.detail?.BUBBLE)];
      if (stage && !seen.has(stage)) { seen.add(stage); t.mark(`${stage}-turn`); await t.pause(2200); }
      return false;
    };
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      console.log("attempt", attempt);
      t.reset();
      await startTable(t);
      await playUntil(t, note, 500);
      // the winner screen also shows when a bot wins: only the hero's own win is the ad's champion shot
      if (await t.tid("tournament-winner").waitFor({ timeout: 5000 }).then(() => true, () => false)) {
        if ((await t.tid("tournament-winner").innerText()).toUpperCase().includes("WON THE TOURNAMENT")) {
          t.mark("champion"); await t.pause(3500); return;
        }
        console.log("a bot won this one");
      }
      seen.clear();
      await t.page.goto(`${t.page.url().split("#")[0]}#/login`);
    }
    throw new Error("no champion in 30 attempts");
  },
  // the bubble, as short as the champion tries: fast blinds, 10 BB stacks, stop a few hands after the bubble shows
  async stages() {
    await t.settings({ ...SHORT, blindLevelMinutes: 2 });
    await signIn(t);
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      console.log("attempt", attempt);
      t.reset();
      await startTable(t);
      let marked = false;
      await playUntil(t, async (a) => {
        const stage = { BUBBLE: "bubble", "FINAL TABLE": "final" }[String(a.detail?.BUBBLE)];
        if (stage && !marked) { marked = true; t.mark(`${stage}-turn`); await t.pause(2600); return true; }
        return false;
      }, 500);
      if (marked) return;
      await t.page.goto(`${t.page.url().split("#")[0]}#/login`);
    }
    throw new Error("no bubble in 12 attempts");
  },
  // the leaderboard of the local players (the demo player is not on it)
  async leaderboard() {
    await signIn(t);
    await t.page.evaluate(() => { location.hash = "#/leaderboard"; });
    await t.tid("leaderboard-page").waitFor({ timeout: 20000 });
    await t.tap(t.tid("lb-all"));
    await t.tid("lb-list").waitFor({ timeout: 20000 });
    t.mark("leaderboard"); await t.pause(2600);
  },
  // the review pages on the demo player's saved history
  async study() {
    await t.settings(DEFAULTS);
    // My Mistakes lists the active table: play against the coach there first, off camera
    await signIn(t, false); await startTable(t);
    let decisions = 0;
    await playUntil(t, () => ++decisions > 16, 60, (a) => (wants(a) === "FOLD" ? "CALL" : "FOLD"));
    t.startCapture();
    await t.page.evaluate(() => { location.hash = "#/login"; });
    const go = async (hash, id) => { await t.page.evaluate((h) => { location.hash = h; }, hash); await t.tid(id).waitFor({ timeout: 20000 }); };
    await go("#/mistakes", "mistakes-page").catch(() => t.page.waitForTimeout(1500));
    t.mark("mistakes"); await t.pause(2600);
    await go("#/report", "report-summary");
    t.mark("report"); await t.pause(900);
    await t.tid("report-stats").evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "start" }));
    await t.pause(2200);
    await go("#/ranges", "ranges-page");
    t.mark("tools"); await t.pause(1200);
    await go("#/icm-calculator", "icm-calculator-page"); await t.pause(1400);
  },
  async shove() { await spot("sb_shove", "shove"); },
  async icm() { await spot("allin_icm", "icm"); },
};

async function spot(prefix, label) {
  await t.settings(SHORT);
  await signIn(t); await startTable(t);
  // a shove at 2 BB is not worth showing: ask for 6 BB or more behind
  const deep = (x) => Number(x.reasonParams?.depth ?? 99) >= 6;
  const a = await playUntil(t, (x) => String(x.reasonCode).startsWith(prefix) && deep(x), 30, true);
  if (!a) throw new Error(`no ${prefix} spot`);
  t.mark(`${label}-turn`);
  if (label === "icm") {
    // the strip cuts the prize-pool line: the sheet shows it
    await t.pause(900); await t.tap(t.tid("strip-why")); t.mark("icm-sheet"); await t.pause(1900);
    await t.page.keyboard.press("Escape"); await t.pause(300);
  } else await t.pause(2200);
  await act(t, wants(a)); t.mark(`${label}-done`); await t.pause(1800);
}

try {
  await TAKES[NAME]();
} finally {
  await t.finish();
}
