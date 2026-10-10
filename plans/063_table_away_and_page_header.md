---
id: 063
title: Stepping Away from the Table, and One Page Header
phase: 6
status: complete
depends_on: [62]
test_file: backend/tests/test_table_away.py
implementation_files: [backend/app/services/game_session.py, backend/app/services/session_store.py, backend/app/services/game_state_view.py, backend/app/schemas/game_schemas.py, backend/app/api/routes_away.py, backend/app/main.py, frontend/src/hooks/useTableAway.ts, frontend/src/hooks/useAwayTable.ts, frontend/src/services/tableAway.ts, frontend/src/components/PageHeader.tsx, frontend/src/components/TableHeader.tsx, frontend/src/pages/HomePage.tsx, frontend/src/styles/page-header.css]
---

# Objective

A player in the middle of a table can open MY MISTAKES (or go HOME), read,
and come back to the same table with the tournament clock where they left it.
Every page shares the table's header style.

# Findings (before this change)

- PAUSE only holds the browser's automatic next-hand countdown and is
  disabled during a hand. Nothing stopped the tournament clock.
- The level clock runs on wall time on the server, so the blinds rose while
  the player was on another page, and `state()` restarted a paused clock
  whenever a finished hand was viewed.
- A table left for 30 minutes was marked abandoned and evicted.
- Each page carried its own large HOME button in a different place.

# Change

1. Server: `GameSession.away`. `POST /api/game/{id}/away` stops the clock,
   `POST /api/game/{id}/back` restarts it from the same second. `state()`
   does not restart the clock while away; acting or dealing the next hand
   ends the away state. An away table is abandoned after 2 hours, not 30
   minutes. `away` is in the table state. Owner only (404 otherwise).
   The code says "away" because the timer already uses "break" for the
   scheduled breaks between levels.
2. Table header: MY MISTAKES next to HOME. The table page steps away when it
   closes, so HOME, MY MISTAKES, the browser's back button and a typed
   address all stop the clock; it comes back whenever the server reports
   `away` while the page is open (BACK TO TABLE, CONTINUE TABLE, back
   button, reload).
3. `PageHeader` on every page except the table and the home menu: logo, user,
   BACK TO TABLE (after stepping away), HOME, LOG OUT, in the table header's
   pill style. It replaces `HomeButton`. On phones the buttons get their own
   row under the logo.
4. Home menu: CONTINUE TABLE while a table is waiting.

# Out of scope

Closing the browser runs no page cleanup, so that table keeps the normal
30-minute idle timeout with its clock running.

# Results

- Backend: 5 tests in `test_table_away.py` on a fake clock. Removing the
  clock stop, the no-restart guard or the 2-hour rule each fails its test.
- Frontend: 9 tests in `table_away.test.tsx`. Removing the step-away call,
  the come-back call, or the live update of BACK TO TABLE each fails a test.
- Manual, local backend + frontend: mid-hand, MY MISTAKES froze the clock
  (1178 s left, unchanged 5 s later); BACK TO TABLE resumed it (1176, then
  1172) with the same decision pending. HOME froze it and showed CONTINUE
  TABLE A; leaving by typing an address froze it and showed BACK TO TABLE A.
  Checked at 1280px and 375px.
