---
id: 021
title: Opponent Range Estimation
phase: 2
status: complete
depends_on: [17, 19]
test_file: backend/tests/ai/test_opponent_ranges.py
implementation_files: [backend/app/ai/opponent_ranges.py, backend/app/ai/opponent_stats.py]
---

# Objective

Estimate opponent ranges from position/actions/personality and track opponent stats (VPIP, PFR, 3-bet, AF, c-bet, fold-to-cbet) observed during play.

# Requirements

- RangeEstimator: position+action+raise-size -> plausible hand set.
- OpponentStats accumulates observations per seat.
- Stats update after each hand.
- Estimates feed AI and coach.

# Dependencies

Parts 17, 19.

# Tests

Range building, stat accumulation, adaptation after repeated patterns.

# Implementation

backend/app/ai/opponent_ranges.py + opponent_stats.py.

# Acceptance Criteria

Range/stats tests pass.

# Notes

Session-adaptive: early sessions use baseline defaults.
