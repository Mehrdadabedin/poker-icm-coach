---
id: 047
title: Re-Entry / Bust-Out Rule (Levels 1-3)
phase: 5
status: complete
depends_on: [12]
test_file: backend/tests/tournament/test_reentry.py
implementation_files: [backend/app/services/game_session.py]
---

# Objective

Starting stack 45,000. A player who busts (0 chips) during levels 1-3
receives a fresh 45,000 stack and stays in the tournament. From level 4
onward a busted player is eliminated. No re-entry after level 3.

# Implementation

- GameSession.next_hand() applies re-entry/elimination after each completed
  hand: for every non-eliminated player with stack == 0, if level_index < 3
  reset stack to 45,000, else mark eliminated.
- Prevents negative stacks (stack is never below 0 by engine invariants).

# Acceptance Criteria

Bust in L1/L2/L3 -> 45,000 again; bust in L4+ -> eliminated; tournament
continues to heads-up; existing all-in/side-pot/showdown logic untouched.
