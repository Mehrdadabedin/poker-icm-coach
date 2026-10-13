---
id: 072
title: A Call Where the Coach Raises Is Acceptable, Not a Mistake
phase: 6
status: complete
depends_on: [62, 70]
test_file: backend/tests/strategy/test_test_mode.py
implementation_files: [backend/app/strategy/test_mode.py]
---

# Objective

My Mistakes listed many calls where the coach said RAISE (for example top
pair on the turn, two pair on the river). Those calls are profitable, so
they are not mistakes; they only leave value. First step of improving the
coaching (the next steps are equity against the opponent's likely range and
preflop charts).

# Why it is safe

The coach recommends RAISE only where calling is profitable too:

- after the flop it says RAISE only when equity is at least 5 points above
  its own calling threshold (pot odds + 8 points);
- before the flop it says RAISE / OPEN RAISE for hands in the open range and
  3-BET for premium hands facing a raise, where calling is its alternative.

# Change

`compare_decisions` grades CALL against RAISE, 3-BET or OPEN RAISE as
ACCEPTABLE ("a reasonable alternative") instead of SUBOPTIMAL. Real
mistakes stay SUBOPTIMAL: folding where the coach raises, calling where it
folds, raising where it folds.

Effects: these calls leave My Mistakes; coach agreement in Statistics
counts them as half (ACCEPTABLE = 0.5) instead of zero; they no longer
count as ICM mistakes. Applies to decisions made after the deploy; hands
already recorded keep their grade.

# Tests

backend/tests/strategy/test_test_mode.py: 2 new (CALL vs RAISE, 3-BET,
OPEN RAISE is ACCEPTABLE; FOLD vs RAISE / 3-BET, CALL vs FOLD, RAISE vs
FOLD stay SUBOPTIMAL). The first failed before the change with "CALL vs
RAISE graded SUBOPTIMAL". Backend 649 passed.
