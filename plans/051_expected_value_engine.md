---
id: 051
title: Expected Value Engine for ICM Coach
phase: 5
status: complete
depends_on: [50]
test_file: backend/tests/strategy/test_ev.py
implementation_files: [backend/app/strategy/ev.py, backend/app/strategy/coach.py, backend/app/api/routes_game.py]
---

# Objective

Add chip EV to the coach response: EV = P(win) x pot - P(lose) x call.
Classify POSITIVE/NEGATIVE EV with CALL/FOLD, while keeping the existing
ICM/tournament recommendation distinct (CHIP EV vs TOURNAMENT/ICM).

# Implementation

- strategy/ev.py computes chip_ev(win_prob, pot, to_call).
- CoachRecommendation gains ev fields; /api/coach/advice returns them.
- UI shows CHIP EV / TOURNAMENT-ICM / RECOMMENDATION.

# Acceptance Criteria

Positive and negative EV cases classified; ICM recommendation not replaced.
