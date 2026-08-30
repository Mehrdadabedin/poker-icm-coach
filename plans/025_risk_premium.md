---
id: 025
title: Risk Premium
phase: 3
status: complete
depends_on: [22, 24]
test_file: backend/tests/strategy/test_risk_premium.py
implementation_files: [backend/app/strategy/risk_premium.py]
---

# Objective

Implement risk premium: adjust required equity for all-in calls under ICM pressure; distinguish calculated vs estimated vs heuristic.

# Requirements

- Risk premium derived from ICM pressure, stack ratio, bubble state.
- Required equity = pot-odds equity + risk premium (heuristic unless ICM exact EV available).
- Output labeling: CALCULATED / ESTIMATED / HEURISTIC.

# Dependencies

Parts 22, 24.

# Tests

Premium increases with pressure; labeling correctness; covered/covering effects.

# Implementation

backend/app/strategy/risk_premium.py.

# Acceptance Criteria

Risk premium tests pass.

# Notes

No false precision: always expose confidence/type.
