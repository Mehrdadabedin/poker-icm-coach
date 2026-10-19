---
id: 091
title: CHOPPED Only for a Tie
phase: 7
status: complete
depends_on: []
test_file: backend/tests/services/test_hand_review_chop.py
implementation_files: [backend/app/services/hand_review.py, frontend/src/models/handResult.ts]
---

# Objective

The owner's hand #14 (19 Oct) read CHOPPED and looked like a loss. All-in for
26,025 with AJ on J-7-5-5-9 (two pair), they won the whole main pot, 78,175.
Two bigger stacks had a side pot the hero was not in; one of them won 1,420.

# Cause

`chop` was "more than one player won something", so a main pot and a side
pot to different players read CHOPPED. A hero who lost while two others tied
also read CHOPPED. The chips were right.

# Change

- `hero_chopped`: CHOPPED only when the hero shares a pot with a tied hand.
- When the hero wins and someone else won another pot, the line says so:
  "+52,150 chips · Emma 1 won the other pot".

# Checked

A backend test replays the hand through `settle()` and gets the owner's
screen exactly: pot 82,560, stacks 78,175, 1,420 and 50,735. The old rule
fails 2 of the 3 new backend tests. Frontend 346 passed (3 new).
