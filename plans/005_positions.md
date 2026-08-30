---
id: 005
title: Positions
phase: 1
status: planned
depends_on: [1]
test_file: backend/tests/game/test_positions.py
implementation_files: [backend/app/game/positions.py]
---

# Objective

Define the 9 seated positions UTG, UTG+1, MP, LJ, HJ, CO, BTN, SB, BB and map seat index -> position label given the dealer seat.

# Requirements

- 9 positions in clockwise order starting UTG.
- position_for(dealer_seat, seat_index, num_seats=9) returns the label.
- Values are stable strings used by UI and strategy.
- Export list of all seat positions (e.g. can be extended to 6-max).

# Dependencies

Part 001.

# Tests

Full 9-seat mapping for each dealer seat; labels never collide.

# Implementation

backend/app/game/positions.py.

# Acceptance Criteria

Position tests pass.

# Notes

SB/BTN are 1 and 2 seats clockwise from dealer respectively.
