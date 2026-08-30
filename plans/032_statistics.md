---
id: 032
title: Statistics
phase: 3
status: planned
depends_on: [31]
test_file: backend/tests/services/test_statistics.py
implementation_files: [backend/app/services/statistics.py]
---

# Objective

Implement session statistics: hands played/won, VPIP, PFR, 3-bet, aggression, pot sizes, BB won/lost, profit, coach agreement, ICM mistakes, position and stack-depth performance.

# Requirements

- StatsEngine aggregates HandHistoryRecord list.
- Statistics output dict with all spec metrics.
- Coach agreement rate and biggest-leak detection (worst position/action category).

# Dependencies

Part 31.

# Tests

Aggregation math on synthetic records, agreement, leak detection.

# Implementation

backend/app/services/statistics.py.

# Acceptance Criteria

Stats tests pass.

# Notes

UI renders via part 34 API.
