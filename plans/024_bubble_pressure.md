---
id: 024
title: Bubble Pressure
phase: 3
status: planned
depends_on: [22, 23]
test_file: backend/tests/strategy/test_bubble.py
implementation_files: [backend/app/strategy/bubble.py]
---

# Objective

Detect tournament stage and bubble: early/middle/late, bubble approaching/active/post-bubble, final table, short-handed, heads-up; compute bubble pressure LOW..VERY HIGH.

# Requirements

- Stage detection uses players remaining, paid positions, stacks, blind level.
- Bubble pressure heuristic: distance to bubble, short-stack counts, stack vs average.
- Outputs labels + pressure levels used by coach.

# Dependencies

Parts 22, 23.

# Tests

Each stage detected in fixtures; pressure monotonic in edge cases.

# Implementation

backend/app/strategy/bubble.py.

# Acceptance Criteria

Stage/pressure tests pass.

# Notes

Pressure is heuristic; clearly labeled HEURISTIC in coach output.
