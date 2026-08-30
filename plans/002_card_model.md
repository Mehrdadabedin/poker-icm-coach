---
id: 002
title: Card Model
phase: 1
status: complete
depends_on: [1]
test_file: backend/tests/poker/test_card.py
implementation_files: [backend/app/poker/card.py]
---

# Objective

Model a standard playing card: 13 ranks (2-A), 4 suits, string representation, equality, sorting.

# Requirements

- Card has a suit and a rank.
- Ranks: 2..10, J, Q, K, A with numeric values 2..14 (Ace high by default).
- Suits: clubs, diamonds, hearts, spades.
- Card(s) constructible from "As", "Td", "9h", "2c" strings and from rank/suit enums.
- str(card) returns e.g. "A♠"; ascii fallback "As".
- Cards compare/sort by rank.
- Unknown string raises ValueError.

# Dependencies

Part 001 project setup.

# Tests

pytest tests for parsing, string output, ordering, invalid input, 52 unique combos.

# Implementation

backend/app/poker/card.py with Rank/Suit enums and Card dataclass.

# Acceptance Criteria

All card tests pass; ruff clean.

# Notes

Card is the primitive used by deck, dealer, evaluator, UI models.
