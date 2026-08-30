---
id: 013
title: Tournament Timer
phase: 1
status: complete
depends_on: [12]
test_file: backend/tests/tournament/test_timer.py
implementation_files: [backend/app/tournament/tournament_timer.py]
---

# Objective

Implement tournament blind timer: 20-minute levels, countdown, level-up on zero, start/pause/resume/reset, fast mode.

# Requirements

- Timer counts down remaining seconds in level.
- On zero: advance level, reset duration, notify listeners.
- start/pause/resume/reset lifecycle.
- FAST MODE multiplies elapsed time (dev/testing).

# Dependencies

Part 012.

# Tests

Countdown, level-up crossing zero, pause/resume semantics, fast mode scaling, reset.

# Implementation

backend/app/tournament/tournament_timer.py (pure logic, injected clock).

# Acceptance Criteria

Timer tests pass.

# Notes

UI polls or receives timer state via WebSocket (part 034); engine stays clock-injectable.
