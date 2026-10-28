---
id: 102
title: Leaderboard
phase: 8
status: planned
depends_on: [076, 092, 095]
test_file: backend/tests/api/test_leaderboard.py
implementation_files: [backend/app/services/leaderboard.py, backend/app/api/routes_leaderboard.py, backend/app/main.py, frontend/src/pages/LeaderboardPage.tsx, frontend/src/components/LeaderboardPodium.tsx, frontend/src/styles/leaderboard.css, frontend/src/App.tsx, frontend/src/i18n/messages/en/leaderboard.ts, frontend/src/i18n/messages/es/leaderboard.ts]
---

# Objective

The owner (28 Oct): a leaderboard of the top 100 players by points, with
points won by the place each player finished at the table. Finish places are
already stored: `history_tournaments.finish_place` for every tournament
(plans 076 and 092).

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic, screen 9 (approve before building).

# Decisions

- Points per finished tournament, by finish place (9 players):

  | Place | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
  |---|---|---|---|---|---|---|---|---|---|
  | Points | 100 | 70 | 50 | 35 | 25 | 15 | 10 | 5 | 2 |

  The top 3 match a 50/30/20 payout: winning matters most, and every
  finished tournament gives something.
- Counted: `status = finished` with a `finish_place`. Abandoned tournaments
  give nothing. A re-entry counts once, at the place finally reached.
- Two boards, like the apps players know: This week (Monday 00:00 to Sunday
  24:00 UTC, the dates shown) and All time. The week starts empty every
  Monday.
- Columns: rank, photo (approved photo from plan 094, else the initial),
  display name, points; under the name, wins (1st places) and tournaments
  played. Ties: more wins first, then fewer tournaments, then who got there
  first.
- The top 3 on a podium (2nd, 1st, 3rd), places 4 to 100 in a list. The
  player's own row is always shown at the bottom, with the rank, even
  outside the top 100 ("You: 214th, 120 points").
- Names: the profile's display name (plan 095), never the username. Google
  accounts get their username from the email address, so showing it would
  show part of the email. Players without a profile are not listed until
  they make one; their own row says "Create your profile to appear".
- Everyone can see it, Free and Pro (plan 100): competing brings players
  back.
- `GET /api/leaderboard?period=week|all` returns the top 100 and the
  caller's own row. One SQL query over `history_tournaments` joined with
  `user_profiles`; cached for 60 s, with "Updated N min ago" on the page.
- Place: a Leaderboard card on Home (the top 3 and "See top 100"), page
  `#/leaderboard`.
- Admin accounts and the demo account (`demoplayer`) are left out.

# Owner's answers (28 Oct)

1. Points: the table above, not wins only.
2. No weekly cap: every finished tournament counts.

# Tests

- Points by place; abandoned and unfinished tournaments give 0; week and
  all-time windows at the Monday boundary.
- Order and ties; at most 100 rows; the caller's own row outside the top
  100.
- Display names only, no username anywhere in the response; players
  without a profile, admins and `demoplayer` left out.
- Frontend: podium, list, own row, both languages.
