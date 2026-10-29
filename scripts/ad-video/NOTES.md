# Vertical ad video: status (plan 098)

Recorded on the Phase 2 app (plans 099 to 104, 106) and assembled. Not pushed: the owner watches it
first. Output goes to `~/Videos/icmbot-ads/` (never `frontend/public/videos/`):
`ICMBOT_ad_9x16.mp4` (with music), `ICMBOT_ad_9x16_silent.mp4`, `ICMBOT_ad_9x16_contact_sheet.png`.

## How it is made

- `lib.mjs`: records a **432x768** CSS phone page at `deviceScaleFactor` 2.5, exactly 1080x1920 and still
  the upright phone layout. (390x693 is a short phone now: under 700 px the felt shrinks, `useFeltFit`.)
  Frames come from `Page.captureScreenshot` (about 28 fps), because Playwright's `recordVideo` does not
  scale a page with `deviceScaleFactor`. Capture starts after the first `goto`; a ring shows each tap.
  At every `t.mark()` the page is checked and the take exits 1 when a lock icon, an Upgrade card or sheet,
  the locked coach chip, or a seat behind the bet buttons is visible.
- Account: **Pro, not admin** (admins see open-lock icons). Locally plans are per user. The backend runs
  with `ADMIN_BOOTSTRAP_PASSWORD` from a scratch file; sign in as Admin once, change its password, then
  `PUT /api/admin/users/demoplayer/plan {"plan":"pro"}` (same as Admin, Users, Free/Pro switch). Backend
  state is in memory, so repeat this after every restart. Passwords only in `/tmp` scratch files.
- Theme: dark. Headless Chromium reports a light scheme and the app follows it by default, so the context
  sets `colorScheme: "dark"` and `icmbot.theme` = dark before the first paint; the guard fails a take whose
  `data-theme` is not dark. The info line and the history drawer stay closed in the table shots.
- `DEAL_SEED` (`backend/app/core/deal_seed.py`): fixed deals, never set on Render
  (`backend/tests/test_deal_seed.py`). Each seeded take needs a fresh backend:
  ```
  cd backend && DEAL_SEED=69 ADMIN_BOOTSTRAP_PASSWORD=$(cat /tmp/adminboot.pass) AUTH_STORAGE=file AUTH_USERS_FILE= AUTH_SESSIONS_FILE= HISTORY_DIR= HISTORY_STORAGE=database CORS_ORIGINS=http://localhost:5175 uv run uvicorn app.main:app --port 8766
  cd frontend && VITE_API_URL=http://localhost:8766 npx vite --port 5175 --strictPort
  timeout 300 node scripts/ad-video/takes.mjs co /tmp/ad/co /tmp/demoplayer.pass
  ```
  Seeds (still right after the rebase onto Phase 2): `co` 69, `shove` 11, `icm` 19, `study` and
  `champion` none (`champion` needs random deals). Local PostgreSQL (`docker compose up -d postgres`,
  `alembic upgrade head`) holds the demo history: seed it once with
  `cd backend && uv run python ../scripts/demo-video/seed_history.py demoplayer`.
- Takes: `co` (strip, Why sheet, glossary tap on CO, fold, hand review grade, raise sizes), `shove`,
  `icm` (opens the Why sheet: the strip cuts the prize-pool line), `study` (plays 16 decisions against
  the coach off camera so My Mistakes has content, then My Mistakes, Report, Ranges, ICM calculator),
  `stages` (2 min levels, 10 BB stacks: stops 2.6 s after the coach shows the bubble stage) and `leaderboard`
  (All time tab). `champion` (same setup, plays to the end; keeps only its last try, `t.reset()`) is still in
  `takes.mjs`, but a win by the hero is rare: about 1 in 16 tries, and the winner screen also shows when a bot
  wins, so the take only accepts "WON THE TOURNAMENT".
- `overlays.mjs` makes the text layers as PNGs and exits 1 when one is outside the safe area.
  `assemble_ad.py` cuts the takes by mark, overlays, adds music or a silent track. The footage fills the whole
  frame (no shift). `check_ad.py` checks the file.
  ```
  node scripts/ad-video/overlays.mjs scripts/ad-video/shots.json /tmp/ad/ov
  uv run --with imageio-ffmpeg python scripts/ad-video/assemble_ad.py scripts/ad-video/shots.json /tmp/ad /tmp/ad/ov ~/Videos/icmbot-ads/ICMBOT_ad_9x16.mp4 ~/Videos/icmbot-ads/music/rise.m4a 16.0
  uv run --with imageio-ffmpeg python scripts/ad-video/check_ad.py ~/Videos/icmbot-ads/ICMBOT_ad_9x16.mp4
  ```

## Safe area (Meta)

Source: Meta Ads Guide, Instagram Reels
(https://www.facebook.com/business/ads-guide/update/video/instagram-reels): "leave at least 14% of the
top, 35% of the bottom, and 6% on each side of your asset free from text, logos, or other important
creative elements". Stories (Creative best practices for Stories,
https://www.facebook.com/business/help/304846896685564) is looser: about 14% top and 20% bottom. The
Reels numbers are the stricter, so they are used. Meta's overview
(https://www.facebook.com/business/help/980593475366490) adds that with disclaimers on Reels the bottom
40% stays free (this ad has none), and that 9:16 video ads in Instagram Feed use the same zone.

On 1080x1920: x 65 to 1015, y 269 to 1248. Each shot has one dark panel (x 85 to 995, from y 936 or 940 to about y 1240): the PRO pill above the words, the
words (two lines at most), `icmbot.one` small below. It starts below the coach strip and the hero's seat (the
seat ends near y 925) and ends above the bottom zone, so it covers no app text that matters, no coach strip, no
hero cards and no bet buttons. The end card (logo, START FREE, line, button) is inside too; `overlays.mjs`
fails otherwise. The app's own footage fills the whole frame, so the bet buttons (bottom) are under Instagram's
own buttons: the shots read without them.

## Script

| Time | Screen | Overlay | PRO tag |
|---|---|---|---|
| 0-2 | Table, cards dealt (8h Qs, CO), coach strip | BEGINNER TO FINAL TABLE | no |
| 2-4 | Coach strip FOLD, then the Why sheet | THE COACH SAYS WHY | yes |
| 4-6 | Tap CO in the strip: short definition | LEARN EVERY TERM | no |
| 6-8 | Hero folds, hand review: PREFERRED | PLAY. GET GRADED. | yes |
| 8-10 | Raise with the size buttons | SIZES IN BB | yes (the coach strip is on screen) |
| 10-12 | SB shove at 8.5 BB, coach OPEN JAM | PUSH/FOLD RANGES | yes |
| 12-15 | ICM all-in call spot, Why sheet with prize pool shares | ICM ON ALL-IN CALLS | yes |
| 15-17 | Bubble (level 6, 7 players left) | BUBBLE. FINAL TABLE. | no |
| 17-19 | Leaderboard, All time, five local players | CLIMB THE LEADERBOARD | no |
| 19-21 | My Mistakes | FIX YOUR MISTAKES | yes |
| 21-23 | Report: leaks, VPIP and PFR | FIND YOUR LEAKS | yes |
| 23-25 | Ranges grid, ICM calculator | STUDY TOOLS | yes |
| 25-30 | End card: logo, "Free practice. ICM coach with Pro.", button icmbot.one | START FREE | no |

The opening hook shot has no tag. No champion screen: the hero won the tournament in 1 of about 16 tries over
two sessions, and the owner stopped the retries. The fallback of the brief is used: the bubble comes from a
short take (no final-table frame was reached, so "BUBBLE. FINAL TABLE." is on the bubble frame), and the
leaderboard replaces the champion screen. Every frame is real app output on the local backend. The
leaderboard needs other players: `seed_history.py` ran for `adlocal1` to `adlocal5` (the real engine; the
finish places were then set by SQL so the points differ) with profile rows "Local Ace", "Local King",
"Local Queen", "Local Jack", "Local Ten" in the local PostgreSQL only. Those rows were deleted after the
recording; no real player's name is on screen.

## Music

Track `rise.m4a`, Meta Sound Collection (https://www.facebook.com/sound/collection/), chosen by the
owner, file dated 29 Oct. 2:40, about 120 BPM, quiet intro, the full beat drops at 16.0 s. The ad uses
16.0 s to 46.0 s: the drop lands on the first frame, and the 2 s cuts fall on every fourth beat. Fade
out over the last 1.5 s (under the end card), loudness -16 LUFS (loudnorm), checked at -16.1. The file
is not committed: the Sound Collection page says "Free to use in any videos you create and share on
Facebook and Instagram", so it covers Facebook and Instagram only, not the repo or other platforms.
Paid ads: Meta's Reels ads guide lists "Licensed music" as not allowed in Reels ads and recommends
"royalty-free music available in our Meta Sound Collection instead", so Sound Collection music is the
recommended source for Reels ads. I could not read Meta's Sound Collection terms page (it is not
public without a login), so I did not verify the terms in full. The silent copy is for other platforms.

## Facebook and Instagram ad notes (read from Meta, not acted on)

ICMBOT is free-to-play poker practice, no real money, so on Meta it is a "social casino / free-to-play"
game that simulates poker. Meta's Online Gambling and Games policy
(https://transparency.meta.com/policies/ad-standards/restricted-goods-services/gambling-games/):
- Allowed without Meta's written authorization when the game is entirely free to play, has no chance to
  win anything of monetary value, and is not offered with a paid trial.
- Ads must target people 18 or older.
- Not allowed in: Azerbaijan, Bangladesh, Cambodia, Egypt, Hong Kong, India, Indonesia, Korea,
  Kyrgyzstan, Malaysia, Mongolia, Myanmar, Pakistan, Philippines, Saudi Arabia, Singapore, Taiwan,
  Thailand, Vietnam.
- Advertisers must obey local laws; ads must not depict or target minors.
- Authorization is needed for "games offering a limited trial period and requiring payment
  thereafter". Pro is not built yet (payment shows "Coming soon"). Before Pro costs money, ask Meta or
  a lawyer whether a Free plan with a paid Pro plan changes the category. The ad says "ICM coach with
  Pro", so this needs an answer before the ad runs.
Not checked: Spanish-speaking country rules, TikTok and Google ad rules, any age gate in the app itself.
