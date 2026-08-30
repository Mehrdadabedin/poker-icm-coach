---
id: 022
title: ICM Engine
phase: 3
status: planned
depends_on: [12]
test_file: backend/tests/icm/test_icm.py
implementation_files: [backend/app/icm/icm_engine.py, backend/app/icm/payout.py]
---

# Objective

Implement the Independent Chip Model (ICM): compute tournament equity per player from stacks and payout structure.

# Requirements

- ICMPayout: prize pool from configurable payout percentages (9/18/27/45/90/custom).
- ICMEngine: exact recursion for <= 9 players; Monte Carlo approximation beyond (clearly labeled).
- Outputs per-player tournament equity; equity of chip movements (fold vs call EV difference).
- If no payout structure: ICM NOT ACTIVE.

# Dependencies

Part 012.

# Tests

Two-player ICM sanity (heads-up equity ~ stack share), three-player values vs hand-computed ICM, payout validation, not-active flag.

# Implementation

backend/app/icm/payout.py + icm_engine.py.

# Acceptance Criteria

ICM tests pass; results labeled exact vs estimated.

# Notes

Keep recursion O(n!) bounded with memoization for <= 9 seats.
