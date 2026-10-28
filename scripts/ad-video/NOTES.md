# Vertical ad video: status (plan 098)

Paused on 28 Oct by the owner: record after the Phase 2 design (plans 099, 101, 103) is live,
with this pipeline. Nothing here was pushed.

## What works

- `lib.mjs`: records a 390x693 CSS phone page as 1080x1920 frames (Page.captureScreenshot,
  about 28 fps). Playwright's `recordVideo` does not scale a page with `deviceScaleFactor`, so it
  is not used. Capture starts after the first `goto` (a screenshot of `about:blank` never
  returns), each screenshot has a 5 s limit, 3 failures in a row stop the take, `finish()` waits
  at most 10 s. A ring shows each tap.
- `DEAL_SEED` (backend, `backend/app/core/deal_seed.py`): fixed deals. Unset keeps random deals
  (`backend/tests/test_deal_seed.py`, proven by reverting the fix). Never set it on Render.
- `find_seeds.py` (run from `backend/`): seeds for the spots. Results with the folds-only policy:
  - `co`: 69 (also 2896, 3225). Hand 1, hero in the CO with 8h Qs, coach says FOLD.
  - `shove`: 11. Hand 8, SB shove at 9 BB, coach OPEN JAM. (Seed 7 gives a 2 BB spot: not used.)
  - `icm`: 19. Hand 7, "calling is worth 6.6% of the prize pool, folding 10.0%".
- `takes.mjs` takes `co`, `shove`, `icm`, `study` (My Mistakes, Report, Ranges, ICM calculator)
  were recorded and looked right. Each needs a fresh backend with its seed:
  ```
  cd backend && DEAL_SEED=69 AUTH_STORAGE=file AUTH_USERS_FILE= AUTH_SESSIONS_FILE= HISTORY_DIR= HISTORY_STORAGE=database CORS_ORIGINS=http://localhost:5175 uv run uvicorn app.main:app --port 8766
  cd frontend && VITE_API_URL=http://localhost:8766 npx vite --port 5175 --strictPort
  timeout 300 node scripts/ad-video/takes.mjs co /tmp/ad/co /tmp/demoplayer.pass
  ```
  Seeds: `co` 69, `shove` 11, `icm` 19, `study` any. Seed the demo history first with
  `scripts/demo-video/seed_history.py`. Use `timeout` on every node run.
- `overlays.mjs`: popup text, the address tag and the end card as transparent PNGs. Text sits at
  y 1060 (below the coach card); a shot can set `y`. 250 px top and 400 px bottom stay clear.
- `assemble_ad.py`: cuts the takes by mark, overlays the PNGs, adds a silent AAC track. A test cut
  of the 11 shots without the champion take assembled and passed `check_ad.py` except length.
- `check_ad.py`: size, 1080x1920, 28 to 32 s, 30 fps, h264 + aac, LUFS when there is sound.

## What is left

- `champion` take (bubble, final table, champion screen). Fast blinds (2 min levels, x10) with
  10 BB stacks. Bots re-enter through level 5, so the tournament ends only after level 5 and the
  hero busts often. Two attempts failed or were cut short; the retry loop (12 attempts) and the
  bust handling are in `takes.mjs` and `play.mjs` but never produced a winner. If it keeps
  failing, cut the bubble and final-table shots from short takes. Every screen must be real.
- Re-record all takes on the Phase 2 design; check that `gl-term-CO`, `mobile-coach`,
  `review-hand-btn`, `size-play`, `mistakes-page`, `report-stats` test ids still exist.
- Assemble the full ad, contact sheet, `check_ad.py`, write to `~/Videos/icmbot-ads/`.
- Ad platform notes (Meta, TikTok, Google; simulated gambling, 18+), the Spanish version.
- Music: none. Silent version until the owner chooses a licensed track.

## Script (approved 27 Oct)

| Time | Screen | Overlay |
|---|---|---|
| 0-2 | Table, cards dealt (8h Qs, CO) | BEGINNER TO FINAL TABLE |
| 2-4 | Coach: FOLD, "8h Qs is not in the CO open range" | THE COACH SAYS WHY |
| 4-6 | Tap CO: short definition and glossary link | LEARN EVERY TERM |
| 6-8 | Hero folds, hand review: PREFERRED | PLAY. GET GRADED. |
| 8-10 | Raise with the size buttons | SIZES IN BB |
| 10-12 | SB shove at 9 BB, "push/fold equilibrium" | PUSH/FOLD RANGES |
| 12-15 | ICM all-in call spot, prize pool shares | ICM ON ALL-IN CALLS |
| 15-17 | Bubble, final table coach labels | BUBBLE. FINAL TABLE. |
| 17-19 | Champion screen | PLAY TO THE FINAL TABLE |
| 19-21 | My Mistakes | FIX YOUR MISTAKES |
| 21-23 | Report: leaks, VPIP and PFR | FIND YOUR LEAKS |
| 23-25 | Ranges grid, ICM calculator | STUDY TOOLS |
| 25-30 | End card: logo, "Tournament practice with an ICM coach", button icmbot.one | START FREE |

Changes from the first draft: "SIZES IN BB" (was "EVERY SIZE IN BB"), "ICM ON ALL-IN CALLS" (was
"EVERY ALL-IN"), "PLAY TO THE FINAL TABLE" (was "WIN THE TOURNAMENT"). The grade shot uses the
hand review, because a fold that ends the hand shows no grade banner on the table. No "Nash", no
em dashes. The address `icmbot.one` is small in the top-left corner during the cuts.
