---
id: 068
title: A Hand Reaches My Mistakes as Soon as It Ends
phase: 6
status: complete
depends_on: [62]
test_file: backend/tests/test_hand_recorded_at_end.py
implementation_files: [backend/app/services/game_session.py, backend/app/services/session_record.py]
---

# Objective

A mistake shows in My Mistakes (and the hand in HAND HISTORY) right after
the hand ends, not only after the next hand is dealt.

# The bug

GameSession recorded a hand in `_settle_hand()`, which runs from
`next_hand()` (or at once for the tournament's final hand). A player who
made a mistake and opened MY MISTAKES before the next deal did not see it.
Found while recording the demo video (plan 067), which had to deal the next
hand before opening My Mistakes.

# Fix

- `_advance_bots()` records the hand when it detects the hand is complete,
  which is the one place every hand ends (after a hero action, after the
  bots, or in a hand the hero sits out).
- A per-hand flag (`_hand_recorded`, cleared when a hand is dealt) makes the
  call from `_settle_hand()` a no-op, so a hand is never recorded twice.
  Re-entry and elimination still run after recording, as before.
- `record_hand()` moved to `session_record.py`; `game_session.py` stays
  under the 200-line limit.
- The record now carries the blind level at the end of the hand, not the
  level at the next deal (the clock runs during the hand review).

# Tests

`backend/tests/test_hand_recorded_at_end.py`, 3 tests: the hand is in the
history before the next deal; the next deal does not record it again; the
`/hands` API lists the hand that just ended. With the record call removed,
the first and third fail with "the hand that just ended must be recorded
before next_hand()". Backend 647 passed.
