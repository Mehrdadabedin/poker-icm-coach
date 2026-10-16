---
id: 082
title: Demo Video With Reports
phase: 7
status: complete
depends_on: [67, 78, 79, 81]
test_file: scripts/demo-video/README.md
implementation_files: [scripts/demo-video/record_demo.mjs, scripts/demo-video/demo_scenes.json, scripts/demo-video/endcard.mjs, scripts/demo-video/seed_history.py, scripts/demo-video/README.md, frontend/public/videos/ICMBOT_promo.mp4]
---

# Objective

A new landing-page video that shows the updates since plan 067 (Hand
History, the Report, the betting controls), with a more natural female voice
and without the "AI-generated voice" note at the bottom (owner's request).

# Change

- Flow: landing page, sign in, choose 8 bots, a hand where the coach bets
  and the size is picked with the size buttons and Enter, a call where the
  coach folds, My Mistakes, Hand History, the Report from the summary down
  to the bet sizes, end card. 51 s, 6.3 MB (the old video was 6.5 MB).
- Voice: ElevenLabs v4 "jessica" through OpenRouter (the owner liked
  "jessica" and "sarah"). The lines say "ICM Bot": written "ICMBOT", all
  four voices tried said "ICM B-O-T".
- End card without the note. It was there for OpenAI's voice terms; the
  video uses an ElevenLabs voice.
- seed_history.py gives the local demo account five saved tournaments
  through the real engine, following the coach 82% of the time, so the
  Report shows real numbers (6 tournaments, 88.6% agreement, three leaks).
- record_demo.mjs follows the betting controls of plan 081: it waits for any
  live button (FOLD is greyed out when checking is free, CALL when only fold
  or all-in answer a shove), raises with a size and Enter, and calls an
  all-in bigger than the stack with ALL-IN.

# Checked

Frames of every scene and the end card reviewed; loudness normalised to
-16 LUFS by assemble.py. Three takes: the first stopped at a greyed-out
FOLD, the second staged its "mistake" on a free check, the third is the one
used.

# Found, not changed

The coach says FOLD in an unraised pot when checking is free (the big blind,
or the small blind at 100/100), because its preflop branch treats "nobody
raised" as "first in". A check there may then be graded against FOLD. For
plan 080 step B0.
