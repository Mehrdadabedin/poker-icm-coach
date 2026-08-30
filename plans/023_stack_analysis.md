---
id: 023
title: Stack Analysis
phase: 3
status: planned
depends_on: [12]
test_file: backend/tests/strategy/test_stack_analysis.py
implementation_files: [backend/app/strategy/stack_analysis.py]
---

# Objective

Implement stack analysis: hero stack/BB, effective stack, average/median/min/max stacks, hero rank, big/medium/short/very-short classification.

# Requirements

- stack_in_bb(chips, big_blind).
- effective_stack(hero, villain).
- Table snapshot: average, median, largest, shortest, rank.
- Classify hero stack band (BIG/MEDIUM/SHORT/VERY SHORT).

# Dependencies

Part 012.

# Tests

BB math, effective stack, rankings, classification boundaries.

# Implementation

backend/app/strategy/stack_analysis.py.

# Acceptance Criteria

Stack analysis tests pass.

# Notes

Every screen that shows stacks uses this module (no duplicated math).
