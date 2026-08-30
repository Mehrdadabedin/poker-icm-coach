---
id: 028
title: Push/Fold Engine
phase: 3
status: planned
depends_on: [27, 24]
test_file: backend/tests/strategy/test_push_fold.py
implementation_files: [backend/app/strategy/push_fold.py]
---

# Objective

Implement the push/fold engine: open jam, reshove, call jam with pot-odds + risk-premium math for short stacks (<= 10 BB).

# Requirements

- Open-jam range by position and stack depth from baseline.
- Reshove range vs raiser by position/stack.
- Call-jam decision: pot odds vs estimated equity minus risk premium.
- Effective stack uses min(hero, villain).

# Dependencies

Parts 27, 24.

# Tests

10/8/6/4/3 BB decision tables, pot-odds boundary, risk premium adjustments.

# Implementation

backend/app/strategy/push_fold.py.

# Acceptance Criteria

Push/fold tests pass.

# Notes

Coach recommends from this engine when stack <= 10 BB.
