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
- Theme: dark (default). The info line and the history drawer stay closed in the table shots.
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
  `champion` (2 min levels, 10 BB stacks, up to 12 tries; it won on the 4th try of the second run).
- `overlays.mjs` makes the text layers as PNGs and exits 1 when one is outside the safe area.
  `assemble_ad.py` cuts the takes by mark, moves the footage down 100 px (so the tags fit above the coach
  strip), overlays, adds music or a silent track. `check_ad.py` checks the file.
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

On 1080x1920: x 65 to 1015, y 269 to 1248. The address tag (top left, y 280), the PRO tag (top right,
y 280), the big words (y 940 to 980, two lines at most) and the end card (logo, START FREE, line, button)
all sit inside; `overlays.mjs` fails otherwise. The app's own footage fills the whole frame, so the
bet buttons (bottom) are under Instagram's own buttons: the shots read without them.

## Script

| Time | Screen | Overlay | PRO tag |
|---|---|---|---|
| 0-2 | Table, cards dealt (8h Qs, CO), coach strip | BEGINNER TO FINAL TABLE | no |
| 2-4 | Coach strip FOLD, then the Why sheet | THE COACH SAYS WHY | yes |
| 4-6 | Tap CO in the strip: short definition | LEARN EVERY TERM | no |
| 6-8 | Hero folds, hand review: PREFERRED | PLAY. GET GRADED. | yes |
| 8-10 | Raise with the size buttons | SIZES IN BB | no |
| 10-12 | SB shove at 8.5 BB, coach OPEN JAM | PUSH/FOLD RANGES | yes |
| 12-15 | ICM all-in call spot, Why sheet with prize pool shares | ICM ON ALL-IN CALLS | yes |
| 15-17 | Bubble (level 6, 7 players left) | BUBBLE. FINAL TABLE. | no |
| 17-19 | Champion screen (real, from a played tournament) | PLAY TO THE FINAL TABLE | no |
| 19-21 | My Mistakes | FIX YOUR MISTAKES | yes |
| 21-23 | Report: leaks, VPIP and PFR | FIND YOUR LEAKS | yes |
| 23-25 | Ranges grid, ICM calculator | STUDY TOOLS | yes |
| 25-30 | End card: logo, "Free practice. ICM coach with Pro.", button icmbot.one | START FREE | no |

The "SIZES IN BB" shot has no PRO tag: sizes are free, but the coach strip above is visible in it.
The same holds for the first and third shots (the owner's list: no tag on the deal and the glossary
tap). The champion shot is a real champion screen, so no fallback was needed (leaderboard shot not used).
The text follows the repo rules (plain English, no em dashes).

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
