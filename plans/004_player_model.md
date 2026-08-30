---
id: 004
title: Player Model
phase: 1
status: complete
depends_on: [2]
test_file: backend/tests/game/test_player.py
implementation_files: [backend/app/game/player.py]
---

# Objective

Model a tournament player: stack, seat, name, hole cards, actions, folded/eliminated state.

# Requirements

- Player has name, stack, seat index, is_human flag, is_eliminated.
- Can receive/discard hole cards.
- remove_chips/add_chips with validation (no negative stack).
- Track whether folded in current hand and reset each hand.
- bet_tracking per street (contribution to pot).

# Dependencies

Part 002 (Card).

# Tests

Stack math, elimination, chip validation, hole card set/get, fold state reset.

# Implementation

backend/app/game/player.py.

# Acceptance Criteria

Player tests pass; ruff clean.

# Notes

Player is mutable game state, not a DB model.
