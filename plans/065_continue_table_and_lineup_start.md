---
id: 065
title: Continue Table Only for a Live Table, Practice Starts from a Lineup
phase: 6
status: complete
depends_on: [63]
test_file: frontend/tests/home_menu.test.tsx
implementation_files: [frontend/src/services/tableAway.ts, frontend/src/hooks/useAwayTable.ts, frontend/src/components/HomeMenu.tsx, frontend/src/components/TableGone.tsx, frontend/src/pages/HomePage.tsx, frontend/src/pages/TablePage.tsx, frontend/src/App.tsx, frontend/src/pages/BotProfilesPage.tsx, frontend/src/styles/bot-profiles.css]
---

# Objective

1. CONTINUE TABLE (home menu) and BACK TO TABLE (page header) appear only
   after a started table was left, and only while the server still has it.
2. Remove RANDOM OPPONENTS: every practice table starts from a chosen
   8-bot lineup.

# The bug

The menu showed CONTINUE TABLE whenever a table id was saved in the browser
(`icm_away_table`). Tables live in server memory, so a deploy, a restart or
the free instance going to sleep ends them. After the day's deploys the menu
offered CONTINUE TABLE right after login, and it opened
"API ERROR: API 404: table not found".

# Fix

- `checkAwayTable` asks the server for the table's state: "live" (found and
  active), "gone" (404, or the tournament finished) or "unknown" (offline,
  server waking up).
- `useAwayTable` shows the button only when the answer is "live", forgets
  the table on "gone", and keeps it hidden but remembered on "unknown".
- The home menu moved to `HomeMenu`, which mounts only after login, so the
  check runs with the user's token.
- A table link the server no longer knows shows TABLE ENDED with START
  PRACTICE and HOME instead of the raw API error, and forgets the table.

# Random opponents removed

START PRACTICE opens the lineup builder (BOT PROFILES) directly. The
CHOOSE YOUR OPPONENTS screen had only one option left, so it was removed;
old `/start` links redirect to `/bot-profiles`.

# Results

- Frontend 258 passed (253 before). New: home_menu.test.tsx (7),
  table_gone.test.tsx (1), one BACK TO TABLE case in table_away.test.tsx.
  Removed: the three RANDOM OPPONENTS tests.
- Before the fix, 6 of the new tests failed: CONTINUE TABLE shown for a
  404 table, a finished table and an unreachable server; START PRACTICE and
  /start still showing the choice screen; the raw API error page.

# Not changed

- The hidden /training route still starts a table with random bots; it is
  not in the menu.
- `getSelectedProfile` in models/botProfiles.ts is no longer used.
- Tables still live in server memory; keeping them across deploys needs
  them stored in the database.
