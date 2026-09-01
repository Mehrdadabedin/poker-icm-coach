---
id: 050
title: ICM Coach Postflop / Board Analysis
phase: 5
status: complete
depends_on: [49]
test_file: backend/tests/strategy/test_coach.py
implementation_files: [frontend/src/pages/CoachPage.tsx, backend/app/schemas/game_schemas.py]
---

# Objective

CoachPage lets the user select hero cards + 0-5 board cards (street derived:
0 preflop, 3 flop, 4 turn, 5 river), number of opponents, position, effective
stack, pot, amount to call, blind level. Duplicate physical cards between
hero/board prevented. Uses the existing hand evaluator.

# Implementation

- Board picker (up to 5 cards) with street auto-derived; duplicate guard.
- Inputs for opponents, stack, pot, toCall, blinds wired into the existing
  CoachAdviceRequest fields.

# Acceptance Criteria

Flop/turn/river analysis works; duplicates impossible; existing evaluator used.
