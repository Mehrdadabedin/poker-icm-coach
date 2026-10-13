---
id: 078
title: Report Page
phase: 6
status: in-progress
depends_on: [76, 77]
test_file: backend/tests/test_report.py
implementation_files: [backend/app/services/report.py, backend/app/services/report_stats.py, backend/app/services/history_archive.py, backend/app/api/routes_history.py, backend/app/services/session_record.py]
---

# Objective

Step 3 of the reports: one ready-made Report page, no custom report builder
(owner's choice). The owner approved the dark mock-up on 2026-10-13. Two
pull requests: the numbers (this one), then the page.

# Report

`GET /api/history/report?period=7d|30d|90d|all&tournament=<id>`, signed-in
user only, built from the saved history (plan 076). Default period 30d. A
chosen tournament stands alone: the period does not apply to it. Another
user's tournament answers 404.

1. Summary: tournaments, wins, top 3 finishes, average finish, hands,
   decisions, coach agreement, mistakes per 100 hands, and the last two for
   the period before (30d compares with the 30 days before it).
2. Stack graph: the hero's chips after each hand of the newest tournament (or
   the chosen one), its blind level and the mistakes in each hand.
3. Mistake rate by position and street.
4. Top 3 leaks: the most repeated mistakes, grouped by position, street,
   action and coach advice, with up to 5 example hands, newest first.
5. Mistakes by type: call, fold, all-in, other, as in My Mistakes.
6. Player stats from the action log: VPIP, PFR, 3-bet, steal, c-bet, went to
   showdown, each with its chances and a rule-of-thumb range for a 9-player
   table.
7. Progress: coach agreement and mistakes per 100 hands for each of the last
   12 tournaments, oldest first.

A mistake is a decision graded SUBOPTIMAL, the rule My Mistakes uses. Coach
agreement is the share graded PREFERRED or ACCEPTABLE.

**Fix, own commit**: a won tournament saved no finish place, because only a
bust set one, so the report would count no wins. The last player left now
places 1st. The winner screen does not show a place for the champion, so it
does not change.

# Tests

- backend/tests/test_report.py (8): periods and a chosen tournament, the
  summary, the stack graph, the position and street map, mistake types, leaks
  and their order, progress, player stats from five hand-written action logs,
  sign-in and a bad period (422).
- backend/tests/test_history_archive.py (+1, PostgreSQL): the report through
  the API reads only the user's own hands; another user's tournament is 404.
- backend/tests/tournament/test_hero_finish.py (+1): winning places 1st
  (failed before the fix: `None == 1`).

# Measured

A saved hand is about 2.5 KB. Building the report on this machine: 12
tournaments of 60 hands 32 ms, 100 tournaments 475 ms. The response is about
10 KB either way.

# Found, not changed

"All time" reads every saved hand. Past a few hundred tournaments that gets
slow on Render's free instance; per-tournament summary rows would fix it.
Tournaments won before this change have no finish place and do not count as
wins.
