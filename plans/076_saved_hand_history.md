---
id: 076
title: Hand History Saved Per User and Tournament
phase: 6
status: complete
depends_on: [68]
test_file: backend/tests/test_history_archive.py
implementation_files: [backend/app/models/orm_history.py, backend/app/services/history_archive.py, backend/app/services/hand_history.py, backend/app/services/session_record.py, backend/app/services/game_session.py, backend/app/services/session_store.py, backend/app/services/account_admin.py, backend/app/api/routes_history.py, backend/app/api/routes_meta.py, backend/app/core/config.py, backend/app/main.py, backend/alembic/versions/c5f8a2d4e6b1_history_tables.py]
---

# Objective

Step 1 of the reports (the owner chose one ready-made Report page, no custom
builder). Hands lived only in the table's memory and a file on the host's
temporary disk, so every deploy or restart erased Hand History, Statistics
and My Mistakes. The database tables from the first design (poker_hands,
save_hand) existed but the live game never called them.

# Design

- Two tables, created by the backend itself (Render never runs Alembic) and
  by an Alembic migration for local development:
  - `history_tournaments`: id = table id, owner = username, table label,
    start/end time, status, finish place, starting stack, bot lineup, hands.
  - `history_hands`: tournament id (cascade delete), owner, hand number,
    net chips, the full record with the coach's verdicts as JSON; unique per
    tournament and hand number.
  Names avoid the unused `tournaments` table of the first design.
- Writing: `record_hand` saves each hand the moment it ends (plan 068) and
  keeps the tournament row current; the tournament's end (finished, finish
  place) and an abandoned table are saved too. A database error is logged
  without its parameters and the game goes on. A hand saved twice counts
  once.
- Reading: `GET /api/history/tournaments` (the user's, newest first) and
  `GET /api/history/tournaments/{table_id}/hands` (same shape as the live
  hands API; another user's tournament answers 404).
- Deleting a user deletes their saved history (`history_deleted` in the
  admin reply).
- On when accounts are in the database (`AUTH_STORAGE=database`, which
  production uses); `HISTORY_STORAGE=database|off` overrides. Local runs and
  the test suite keep memory only.

# Tests

backend/tests/test_history_archive.py (7, real PostgreSQL in a fresh schema
per test, skipped without a database): off saves nothing; tables are created
on an empty database; a hand is saved when it ends and read back by a new
archive (a restart); a duplicate save counts once; the end of a tournament is
saved once; the API lists only the owner's tournaments, in the live shape, and
answers 404 to another user; deleting a user removes their rows. With the save
call removed, 3 of them fail. Backend 669 passed.

Checked with a real server process: played a hand, restarted the server, the
tournament and its hand (net +8,760, 5 decisions) came back.

# Next

- Step 2: Hand History lists the user's saved tournaments (a tournament whose
  table is gone after a restart shows as unfinished), names instead of seat
  numbers, filters.
- Step 3: the Report page.
