// Playing the table for the ad takes: follow the coach, stop at a spot.
const ENTER_RAISE = ["3x", "2.5x", "1/2", "2/3"];

export const advice = async (t) => (await t.server("/coach", "POST"));

// the server decides whose turn it is; the buttons lag a poll behind
export async function heroTurnOrOver(t, limitMs = 90000) {
  const end = Date.now() + limitMs;
  while (Date.now() < end) {
    const reentry = t.tid("reentry-continue");
    if (await reentry.isVisible().catch(() => false)) {
      await t.tap(reentry); await t.pause(600);
      // after level 5 re-entry is refused and the modal stays: end this try
      if (await reentry.isVisible().catch(() => false)) { await t.tap(t.tid("reentry-end")); return "ended"; }
      continue;
    }
    const st = await t.server("/state");
    if (st.status !== "active" || st.heroFinishPlace) return "ended";
    if (st.phase === "handOver") return "over";
    if (st.waitingForHero) {
      await t.page.locator(".hero-controls .btn-fold:enabled, .hero-controls .btn-call:enabled, .hero-controls .btn-allin:enabled")
        .first().waitFor({ timeout: 15000 });
      return "turn";
    }
    await t.pause(150);
  }
  throw new Error("no hero turn within the limit");
}

export async function nextHand(t) {
  const next = t.tid("next-hand-btn");
  if (!(await next.isVisible().catch(() => false))) return;
  const reentry = t.tid("reentry-continue");
  if (await reentry.isVisible().catch(() => false)) { await t.tap(reentry); await t.pause(300); }
  if ((await t.server("/state")).status !== "active") return;
  await t.tap(next);
  await next.waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
}

export const wants = (a) => {
  const word = String(a.recommendedAction).toUpperCase();
  if (word.startsWith("RAISE") || word.startsWith("BET")) return "RAISE";
  if (word.startsWith("ALL") || word.includes("JAM") || word === "RESHOVE") return "ALL-IN";
  return word.split(" ")[0];
};

export async function tapRaiseSize(t) {
  for (const k of ENTER_RAISE) {
    const size = t.tid(`size-${k}`);
    if (await size.isVisible().catch(() => false)) { await t.tap(size).catch(() => undefined); break; }
  }
}

export async function act(t, choice) {
  const c = t.page.locator(".hero-controls");
  const fold = c.locator(".btn-fold"), call = c.locator(".btn-call"), allin = c.locator(".btn-allin");
  if (choice === "FOLD") return t.tap((await fold.isEnabled()) ? fold : call);
  if (choice === "ALL-IN") return t.tap(allin);
  if (choice === "RAISE") {
    // no raise button (a short stack facing a bet): the coach's aggression is the all-in, else the call
    if (await t.tid("size-play").isVisible().catch(() => false)) return t.tap(t.tid("size-play"));
    return t.tap((await allin.isEnabled().catch(() => false)) ? allin : call);
  }
  return t.tap((await call.isEnabled()) ? call : allin);
}

// follow the coach (or fold and check when passive; a function picks the choice) until `stop(advice)` is true at a hero turn; returns that advice
export async function playUntil(t, stop, maxHands = 60, passive = false) {
  for (let hands = 0; hands < maxHands;) {
    await nextHand(t);
    const state = await heroTurnOrOver(t);
    if (state === "ended") return null;
    if (state === "over") { hands += 1; continue; }
    const a = await advice(t);
    if (await stop(a)) return a;
    const choice = typeof passive === "function" ? passive(a) : passive ? "FOLD" : wants(a);
    if (choice === "RAISE") await tapRaiseSize(t);
    // a button that stays disabled means the turn moved on: look again
    await act(t, choice).catch((error) => console.error(`act ${choice}: ${String(error).split("\n")[0]}`));
    await t.pause(250);
  }
  return null;
}
