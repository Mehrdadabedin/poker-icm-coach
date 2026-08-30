---
id: 012
title: Tournament Engine
phase: 1
status: complete
depends_on: [4, 5]
test_file: backend/tests/tournament/test_tournament.py
implementation_files: [backend/app/tournament/blind_structure.py, backend/app/tournament/tournament.py]
---

# Objective

Implement tournament engine: 9 players at 45,000 chips, configurable blind structure (default 100/100, 20-min levels), antes support, level lookup.

# Requirements

- BlindStructure: list of levels (small, big, ante, duration).
- Default structure: 100/100, 100/200, 200/300, 200/400, 300/600, 400/800, 500/1000 ... configurable.
- level_at(level_index); advance() to next level.
- Tournament: seats, starting stacks, structure, blinds, ante mode (none/traditional/bba), payout config.
- Blinds/antes never hard-coded outside the structure config.

# Dependencies

Parts 004, 005.

# Tests

Default structure correctness, level advance, BBA ante calculation, config validation.

# Implementation

backend/app/tournament/blind_structure.py + tournament.py.

# Acceptance Criteria

Tournament tests pass.

# Notes

Payout config lives here and feeds ICM later.
