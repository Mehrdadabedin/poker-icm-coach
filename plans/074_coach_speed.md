---
id: 074
title: Coach Answers 7x Faster
phase: 6
status: complete
depends_on: [73]
test_file: backend/tests/equity/test_fast_eval.py
implementation_files: [backend/app/equity/fast_eval.py, backend/app/equity/equity_engine.py, backend/app/strategy/villain_range.py]
---

# Objective

After plan 073 the owner saw the coach panel take more than 5 seconds to show
its advice on Render's free instance. On the development machine a coach
answer took 350 ms at the median and 420 ms at the slowest (48 decisions).

# Cause

Three quarters of the time was `best_hand`: an equity estimate called it about
6,000 times per spot, and each call built Card/HandRank objects and read enum
fields (a million enum lookups per few spots). Render's free instance has a
small share of one CPU, and the single uvicorn worker also queued the table's
350 ms state polls behind the calculation.

# Changes

- `equity/fast_eval.py`: scores 5-7 card hands from plain (rank, suit)
  integers; straights by bit masks. Bigger tuple = better hand, equal = tie.
- `_compare` (every equity function) uses it through a card-to-integer table
  built once.
- `hero_vs_weighted` is exact on the river (each opponent combo scored once)
  and samples 1,000 runouts before it (was 3,000; about +-3 points).
- An opponent range's combos are built once per range and reused.

# Results

| | Before | After |
|---|---|---|
| Coach answer, median | 350 ms | 48 ms |
| Coach answer, slowest | 420 ms | 90 ms |
| One equity spot | ~350 ms | 21 ms (river) to 80 ms |
| Backend test suite | 170 s | 89 s |

Measured over the same 48 decisions (seeded session) on the development
machine. Advice unchanged on the reported spots: QJo vs UTG open 37%, top pair
facing the turn bet 62% (CALL), two pair on the river 64% (CALL). Not measured
on Render: the ratio seen before (about 14x slower) suggests about 0.7 s there.

# Tests

tests/equity/test_fast_eval.py: the fast score ranks 20,000 random showdowns
exactly like best_hand, and each category on a known hand. Backend 660 passed.
