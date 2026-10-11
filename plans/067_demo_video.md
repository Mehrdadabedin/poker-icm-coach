---
id: 067
title: New Narrated Demo Video and a Reusable Pipeline
phase: 6
status: complete
depends_on: [64, 65, 66]
test_file: frontend/tests/landing_minimal.test.tsx
implementation_files: [frontend/public/videos/ICMBOT_promo.mp4, scripts/demo-video/record_demo.mjs, scripts/demo-video/demo_scenes.json, scripts/demo-video/narrate.py, scripts/demo-video/endcard.mjs, scripts/demo-video/assemble.py, scripts/demo-video/README.md]
---

# Objective

Replace the landing demo video with one that shows the current product with
a female narrator, 45 to 50 seconds, keeping the poster. The flow the owner
asked for: start from the demo player, the menu and settings, play a hand,
back to the menu to show Continue table works, back to the table for
another hand, My Mistakes, back to the table, another menu page.

# Result

`ICMBOT_promo.mp4`: 49.0s, 1920x1080, 25 fps, H.264 + AAC, 6.5 MB,
-16.4 LUFS. Scenes: minimal landing page, sign in as demoplayer, menu,
Tournament settings, 8 bots, a hand that follows the coach (PREFERRED, won),
HOME with Continue table, a hand with a call against the coach's fold
(SUBOPTIMAL), My Mistakes listing it, BACK TO TABLE, ICM calculator, end
card. Voice: ElevenLabs "jessica" (eleven-multilingual-v2) through
OpenRouter, chosen by the owner from three samples. The end card says
"AI-generated voice".

# How

Recorded against a local backend that keeps nothing on disk, with
Playwright at 1920x1080 and the page zoomed 1.4x (the layout of a
1371x771 screen, sharp at full HD). The script asks the server whose turn
it is and what the coach advises, then waits until the coach panel shows
that advice before acting: the panel keeps the previous advice until the
new one arrives. Each scene is cut by step marks and timed to its line; see
scripts/demo-video/README.md.

# Found, not changed

- A hand reaches My Mistakes only when the next hand is dealt (the hand is
  recorded in `_settle_hand` at `next_hand`), so a mistake is not listed
  right after it is made.
- scripts/record-promo made the previous video and is no longer used.

# Tests

No code changed; frontend 259 passed (the landing tests check the video
path, which is unchanged).
