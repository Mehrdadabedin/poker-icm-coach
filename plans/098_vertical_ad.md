---
id: 098
title: Vertical Ad Video (9:16)
phase: 7
status: in-progress
depends_on: [097]
test_file: backend/tests/test_deal_seed.py
implementation_files: [backend/app/core/deal_seed.py, backend/app/core/config.py, backend/app/services/game_session.py, scripts/ad-video/]
---

# Objective

The owner (27 Oct): a 30 second vertical ad (1080x1920) for Reels, TikTok and Shorts, recorded from
the real app, silent until a licensed music track is chosen. Script approved 27 Oct (see
`scripts/ad-video/NOTES.md`).

# Decisions

- App change: `DEAL_SEED` (environment) makes `GameSession` deal with a seeded generator, for
  repeatable takes. Unset keeps random deals. Never set it on Render.
- Frames come from `Page.captureScreenshot`: Playwright's video does not scale a phone-sized page.
- Output goes to `~/Videos/icmbot-ads/`, not to `frontend/public/videos/`.

# Status

Paused 28 Oct: record after the Phase 2 design (plans 099, 101, 103). Four takes work, the champion
take and the final assembly are left. See `scripts/ad-video/NOTES.md`.
