---
id: 030
title: Test Mode
phase: 3
status: complete
depends_on: [29]
test_file: backend/tests/strategy/test_test_mode.py
implementation_files: [backend/app/strategy/test_mode.py]
---

# Objective

Implement TEST MODE: hide coach recommendation until hero acts, then grade hero decision PREFERRED / ACCEPTABLE / SUBOPTIMAL with explanation.

# Requirements

- COACH MODE: recommendation shown before hero acts.
- TEST MODE: recommendation withheld; after hero acts, compare with coach action.
- Grading: PREFERRED if same; ACCEPTABLE if near-equal EV; SUBOPTIMAL otherwise (never calls every alternative wrong).
- Stores comparison for stats.

# Dependencies

Part 29.

# Tests

Mode flag behavior, grading logic, comparison payload.

# Implementation

backend/app/strategy/test_mode.py.

# Acceptance Criteria

Test mode tests pass.

# Notes

Grading is heuristic with explicit labels.
