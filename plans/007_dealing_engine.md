---
id: 007
title: Dealing Engine
phase: 1
status: planned
depends_on: [2, 3, 4]
test_file: backend/tests/game/test_dealing.py
implementation_files: [backend/app/game/dealing.py]
---

# Objective

Implement the dealing engine: hole cards to every active player, burn one, flop (3), burn one, turn (1), burn one, river (1). Community cards appear only when requested.

# Requirements

- deal_hole_cards(players, deck) gives exactly 2 unique cards each.
- deal_flop/turn/river burn one card first (burn tracked).
- Community cards never revealed before the street is dealt.
- The engine cannot deal the same card twice (deck guarantees).

# Dependencies

Parts 002, 003, 004.

# Tests

Chip distribution of cards, uniqueness across all hole + community + burns, burn order, progressive reveal.

# Implementation

backend/app/game/dealing.py.

# Acceptance Criteria

Dealing tests pass.

# Notes

Deck is owned by the hand/table, passed into dealing functions.
