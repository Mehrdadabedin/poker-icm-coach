---
id: 008
title: Hand Evaluator
phase: 1
status: planned
depends_on: [2]
test_file: backend/tests/poker/test_hand_evaluator.py
implementation_files: [backend/app/poker/hand_evaluator.py, backend/app/poker/hand_rank.py]
---

# Objective

Implement the complete 7-card Texas Hold'em hand evaluator: all 9 hand categories, best 5 of 7, kickers, ace-low straights, ties.

# Requirements

- Evaluate 5, 6 or 7 cards.
- Categories: High Card, Pair, Two Pair, Trips, Straight, Flush, Full House, Quads, Straight Flush (incl. Royal).
- Ace-low straight (A2345) recognized.
- Comparable HandRank: winner of two hands determined by category then tiebreak cards.
- Works with duplicate-immune card inputs.

# Dependencies

Part 002.

# Tests

Extensive pytest table: every category, known matchups, wheel straight, wheel straight flush, kicker battles, flush tiebreak, full house tiebreak, quads kicker.

# Implementation

backend/app/poker/hand_rank.py (category enum) + hand_evaluator.py.

# Acceptance Criteria

All evaluator tests pass; ruff clean.

# Notes

Encode cards as 4-bit suit + 4-bit rank values for speed (equity engine reuse).
