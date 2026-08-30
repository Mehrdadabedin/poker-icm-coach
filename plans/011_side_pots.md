---
id: 011
title: Side Pots
phase: 1
status: planned
depends_on: [8, 9, 10]
test_file: backend/tests/game/test_side_pots.py
implementation_files: [backend/app/game/side_pot.py]
---

# Objective

Implement side-pot construction and distribution for multiple all-ins.

# Requirements

- From per-player contributions build main pot + side pots.
- Each pot tracks eligible players (still in hand).
- At showdown distribute each pot to the best eligible hand.
- Uncalled all-in amounts returned automatically (side pot cap).

# Dependencies

Parts 008, 009, 010.

# Tests

Multi-all-in scenarios (2 and 3 players), uncalled bet return, eligibility exclusion, chip math exactness.

# Implementation

backend/app/game/side_pot.py.

# Acceptance Criteria

Side pot tests pass.

# Notes

This is the most bug-prone area; table-driven tests required.
