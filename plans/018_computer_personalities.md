---
id: 018
title: Computer Personalities
phase: 2
status: planned
depends_on: [17]
test_file: backend/tests/ai/test_personalities.py
implementation_files: [backend/app/ai/personalities.py]
---

# Objective

Implement 8 distinct computer personalities with configurable tendencies: VPIP, PFR, 3-bet, aggression, bluff, calling, folding.

# Requirements

- Personality profiles: Tight, Aggressive, TAG, Loose, LAG, Passive, Balanced, Adaptive.
- Each defines tendency params and an adjustment policy.
- Adaptive adjusts parameters based on observed session results.
- Per-seat assignment so 8 opponents differ.

# Dependencies

Part 017.

# Tests

Param ranges valid, profile differentiation, adaptive updates bounded.

# Implementation

backend/app/ai/personalities.py.

# Acceptance Criteria

Personality tests pass.

# Notes

Personalities produce believable, distinct behavior; not solver-perfect.
