import { expect, test } from "@playwright/test";

/**
 * End-to-end scenario (spec section 77):
 * start tournament -> hero cards -> opponents act -> hero acts ->
 * flop/turn/river -> showdown -> chips update -> next hand.
 * Spans multiple hands because a fold can end a hand preflop (walk).
 */
test("full tournament hand flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ICM MASTER" })).toBeVisible();

  await page.getByTestId("start-practice").click();
  await expect(page.getByTestId("table-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("poker-table")).toBeVisible();
  expect(await page.locator(".seat").count()).toBe(9);

  // Hero is dealt two cards once the hand starts.
  await expect
    .poll(async () => page.locator(".seat-hero .card").count(), { timeout: 30_000 })
    .toBe(2);

  const boardCounts = new Set<number>();
  const reviewSeen = new Set<string>();
  let completedHands = 0;
  const sawAllStreets = () =>
    boardCounts.has(0) && boardCounts.has(3) && boardCounts.has(4) && boardCounts.has(5);
  const deadline = Date.now() + 150_000;

  while (Date.now() < deadline && (!sawAllStreets() || completedHands === 0)) {
    // Poker table visible while the hand is active.
    if (await page.getByTestId("poker-table").isVisible().catch(() => false)) {
      boardCounts.add(await page.locator(".board .card").count());
      if (await page.locator(".seat").count() !== 9) {
        throw new Error("expected 9 seats while the table is active");
      }
    }

    // Hand review replaces the table; wait for automatic next hand.
    const review = page.getByTestId("hand-review");
    if (await review.isVisible().catch(() => false)) {
      const tag = await page.getByTestId("hand-history-title").textContent({ timeout: 1500 }).catch(() => "?");
      if (!reviewSeen.has(tag)) {
        reviewSeen.add(tag);
        completedHands += 1;
        // review must show a result banner at the top
        await expect(page.getByTestId("result-banner")).toBeVisible();
      }
      // the review auto-advances after the countdown; no NEXT HAND click needed
      await page.waitForTimeout(500);
      continue;
    }

    // Hero acts: only click enabled buttons (prefer CHECK/CALL, then FOLD).
    const enabled = page.locator("[data-testid=hero-controls] button:not(:disabled)");
    const call = page.locator("[data-testid=hero-controls] .btn-call:not(:disabled)");
    const fold = page.locator("[data-testid=hero-controls] .btn-fold:not(:disabled)");
    if (await call.isVisible().catch(() => false)) {
      await call.click();
    } else if (await fold.isVisible().catch(() => false)) {
      await fold.click();
    } else if ((await enabled.count()) > 0) {
      await enabled.first().click();
    }
    await page.waitForTimeout(200);
  }

  expect(sawAllStreets()).toBe(true); // flop, turn, river all appeared
  expect(completedHands).toBeGreaterThanOrEqual(1); // at least one review/auto-next cycle
});

test("range matrix renders", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "RANGES" }).click();
  await expect(page.getByTestId("ranges-page")).toBeVisible();
  await expect(page.getByTestId("range-matrix")).toBeVisible({ timeout: 20_000 });
  expect(await page.locator(".range-matrix tbody tr").count()).toBe(13);
});

test("coach advice renders on standalone screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ICM COACH" }).click();
  await expect(page.getByTestId("coach-page")).toBeVisible();
  await page.getByRole("button", { name: "ANALYZE" }).click();
  await expect(page.getByTestId("advice-panel")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/RECOMMENDATION:/)).toBeVisible();
});
