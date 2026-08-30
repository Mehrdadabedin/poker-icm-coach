---
id: 026
title: Equity Engine
phase: 3
status: planned
depends_on: [2, 21]
test_file: backend/tests/equity/test_equity.py
implementation_files: [backend/app/equity/equity_engine.py]
---

# Objective

Implement the equity engine: hero vs random, hero vs range, range vs range; exact enumeration where practical and Monte Carlo for large cases.

# Requirements

- EquityEngine.enumerate(hand, board, deck) exact when total combos manageable.
- Monte Carlo sampling with seed for large cases (labeled ESTIMATE).
- Support broader ranges (hand lists) vs specific hands.
- Output equity + confidence interval for Monte Carlo.

# Dependencies

Parts 002, 021.

# Tests

Known matchups (AA vs KK etc.), enumeration == monte carlo within tolerance, dead-card handling.

# Implementation

backend/app/equity/equity_engine.py.

# Acceptance Criteria

Equity tests pass.

# Notes

Reuses hand evaluator numeric encoding for speed.
