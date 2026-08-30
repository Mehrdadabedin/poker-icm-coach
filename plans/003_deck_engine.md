---
id: 003
title: Deck Engine
phase: 1
status: complete
depends_on: [2]
test_file: backend/tests/poker/test_deck.py
implementation_files: [backend/app/poker/deck.py]
---

# Objective

Implement a real 52-card deck: exactly 52 unique cards, shuffle, draw, reset, never duplicate in one hand.

# Requirements

- Deck() creates 52 unique cards.
- shuffle() randomizes (seeded random supported for tests).
- draw() pops one card; drawing from empty raises DeckEmpty.
- reset() restores the 52-card deck.
- Peeking/popping never returns the same card twice before reset.

# Dependencies

Part 002 (Card).

# Tests

Deck length, uniqueness, shuffle changes order, draw reduces count, empty deck raises, reset restores.

# Implementation

backend/app/poker/deck.py using random.Random instance (injectable seed).

# Acceptance Criteria

Deck tests pass; ruff clean.

# Notes

Use injectable Random for deterministic tests.
