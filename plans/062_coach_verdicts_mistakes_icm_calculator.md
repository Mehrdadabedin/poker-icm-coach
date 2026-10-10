---
id: 062
title: Coach Verdicts in Hand History, My Mistakes Page, ICM Calculator
phase: 6
status: complete
depends_on: [30, 31, 32]
test_file: backend/tests/test_hand_verdicts.py
implementation_files: [backend/app/strategy/test_mode.py, backend/app/services/hand_history.py, backend/app/services/game_session.py, backend/app/services/session_record.py, backend/app/services/statistics.py, backend/app/api/routes_meta.py, frontend/src/pages/MistakesPage.tsx, frontend/src/components/MistakeCard.tsx, frontend/src/pages/IcmCalculatorPage.tsx, frontend/src/services/icmApi.ts]
---

# Objective

Close the "play, record, analyze, statistics, leaks" loop the way a tracker
such as DriveHUD does, but for ICM decisions: every hero decision keeps the
coach's verdict, players can review their mistakes, and an ICM calculator
explains what a stack is worth.

# Findings (before this change)

- `GameSession._record_and_persist` builds each `HandHistoryRecord` without
  `hero_decision`, `coach_recommendation`, `grade` or `icm_pressure`. Those
  fields existed but were never filled in live play, so VPIP, PFR,
  aggression, coach agreement, ICM mistakes and biggest leak on the
  Statistics page had no data.
- `compare_decisions` compared raw words. The engine records `ALL_IN`,
  `RAISE`, `CALL`; the coach answers `OPEN JAM`, `RESHOVE`, `OPEN RAISE`,
  `CALL JAM`. An all-in when the coach said OPEN JAM, or a raise when it
  said OPEN RAISE, was graded SUBOPTIMAL.
- `GET /api/icm` exists but no page uses it.

# Change

1. Grading: the same action written differently counts as the same action
   (all-in = OPEN JAM = RESHOVE = ALL-IN, raise = OPEN RAISE, call = CALL
   JAM). Existing poker judgements (raise vs 3-BET is ACCEPTABLE) stay.
2. Verdicts: each hero action stores a `HandDecision` (street, hero action,
   coach action, grade, ICM pressure, explanation, stack in BB, board, to
   call) on the hand. The coach advice already shown for that decision is
   reused instead of recomputed. The hand's summary fields come from its
   worst decision, so hero action, coach action and grade describe the same
   moment; VPIP/PFR/3-bet read the first preflop decision.
3. `GET /api/game/{table_id}/hands` returns each hand's `decisions`.
4. My Mistakes page (`/mistakes`): every SUBOPTIMAL decision of the active
   table, grouped as wrong call, wrong all-in, wrong fold and other, with
   cards, position, street, stack in BB, ICM pressure and the coach's line.
5. ICM calculator page (`/icm-calculator`) on top of `GET /api/icm`.

# Out of scope

Hand history across sessions (it still lives with the live table), progress
charts, leak report across sessions, and replaying mistakes as drills. They
need hand history in PostgreSQL first.

# Results

- Backend: 4 tests in `test_hand_verdicts.py`, 3 in `strategy/test_test_mode.py`.
  Removing the verdict line fails two verdict tests; the old grading fails
  "ALL_IN vs OPEN JAM graded SUBOPTIMAL".
- Frontend: 5 tests in `mistakes.test.tsx`, 6 in `icm_calculator.test.tsx`
  (the calculator was written by the haiku-worker agent and reviewed).
- Manual, local backend + frontend: 20 hands of deliberately loose play gave
  43 decisions (29 SUBOPTIMAL, 12 PREFERRED, 2 ACCEPTABLE); every SUBOPTIMAL
  pair was a real disagreement (for example CALL vs RAISE, CHECK vs BET).
  Statistics showed VPIP 35%, aggression 3%, coach agreement 30%, where
  live play had shown no data. Both pages checked at 1100px and 375px.
