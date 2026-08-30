---
id: 006
title: Dealer Button Rotation
phase: 1
status: planned
depends_on: [5]
test_file: backend/tests/game/test_dealer_button.py
implementation_files: [backend/app/game/dealer_button.py]
---

# Objective

Implement dealer button rotation: button moves one seat clockwise after every completed hand, skipping eliminated players.

# Requirements

- next_button(current, num_seats, active_seats) advances one seat.
- Eliminated players are skipped.
- Returns the new button seat index.

# Dependencies

Part 005.

# Tests

Rotation, wrap-around, skip eliminated, single active player edge case.

# Implementation

backend/app/game/dealer_button.py.

# Acceptance Criteria

Rotation tests pass.

# Notes

Heads-up rule (button = SB) handled by tournament/table layer when 2 players remain.
