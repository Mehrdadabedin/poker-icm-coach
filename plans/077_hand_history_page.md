---
id: 077
title: Hand History Lists Your Tournaments, Names Winners, Filters Hands
phase: 6
status: complete
depends_on: [76]
test_file: frontend/tests/history_page.test.tsx
implementation_files: [frontend/src/pages/HistoryPage.tsx, frontend/src/models/history.ts, frontend/src/components/HistoryFiltersBar.tsx, frontend/src/styles/pages.css, backend/app/services/hand_history.py, backend/app/services/session_record.py, backend/app/api/routes_meta.py, frontend/src/hooks/useGame.ts, backend/app/strategy/test_mode.py]
---

# Objective

Step 2 of the reports, plus two fixes the owner approved from the Render logs
and Hand History.

# Changes

**Hand History (step 2)**
- A list of the user's tournaments, newest first, replaces the table id box:
  "Table A · 13 Oct, 16:20 · finished 5th · 18 hands". The live table is
  selected and marked "in progress"; a tournament still marked active whose
  table is gone (a deploy or restart ended it) is "unfinished".
- The live table's hands come from the table; others from the saved history
  (plan 076). Where no history is saved the live table still shows.
- Winners by name ("You", "Sarah 2") instead of seat numbers: every hand now
  records the name at each seat (`seat_names`, `seatNames` in the hands API).
  Hands saved before this show "Seat 5".
- Filters: result (won/lost), mistakes only, position, level, with "1 of 3
  hands match the filters".
- On a phone the hands table scrolls inside its box; the page measured 466px
  wide on a 375px screen before, 375px after.

**Grading**: CHECK where the coach says BET is ACCEPTABLE (the coach bets only
when nobody has bet, CHECK is its alternative, a check risks no chips). Folding
when checking is free stays SUBOPTIMAL. Same reasoning as plan 072.

**Polling**: Render's logs showed `GET /api/game/32e7f08f0900/state 404`
about three times a second: a tab left open on a table that ended at a deploy.
`useGame` stops asking after the first 404; other errors keep polling so a
short outage recovers.

# Tests

- frontend/tests/history_page.test.tsx (6): the list and its labels, the live
  table selected, names and the seat fallback, each filter, no history saved,
  nothing yet, ordinals.
- frontend/tests/use_game_gone.test.ts (2): one request after a 404 (was 9 in
  3 s before the fix); other errors keep polling.
- backend: seat names in the hands API and through a save and load; CHECK vs
  BET acceptable (failed before).
- Frontend 278, backend 671 passed.
- Checked with real servers and the history database: played table A, restarted
  the server, played table B; the list showed B "in progress" and A
  "unfinished" with winners by name.

# Found, not changed

Table labels restart at "A" after a restart (the counter lives in memory), so
two tournaments can both be "Table A"; the date tells them apart.
