---
id: 010
title: Pot Engine
phase: 1
status: planned
depends_on: [4, 9]
test_file: backend/tests/game/test_pot.py
implementation_files: [backend/app/game/pot.py]
---

# Objective

Implement pot accounting: total pot, current bet, per-player contributions and the main pot pool.

# Requirements

- Track contributions per street.
- total_pot() sums contributions.
- Resets contributions at street start.
- Award pot to winner (adds chips), empty pot afterwards.

# Dependencies

Parts 004, 009.

# Tests

Limp/call/raise contribution sums, street reset, award transfers chips.

# Implementation

backend/app/game/pot.py.

# Acceptance Criteria

Pot tests pass.

# Notes

Side pot logic is part 011 and reuses contributions.
