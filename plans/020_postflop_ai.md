---
id: 020
title: Postflop AI
phase: 2
status: complete
depends_on: [8, 17, 18]
test_file: backend/tests/ai/test_postflop_ai.py
implementation_files: [backend/app/ai/postflop_ai.py, backend/app/ai/board_texture.py]
---

# Objective

Implement postflop AI: hand strength vs board texture, draws, pot odds, position, SPR; c-bet, value bet, bluff, semi-bluff, check, call, raise, fold, jam.

# Requirements

- Evaluate made-hand strength and draw potential from own hand + board.
- Board texture classifier (dry/wet/paired/monotone/two-tone/connected).
- Pot-odds comparison drives calling decisions.
- Aggression from personality modulates bet sizing and bluff frequency.
- Never sees opponents' hole cards.

# Dependencies

Parts 008, 017, 018.

# Tests

Texture classification, pot-odds math, decision legality, bluff frequency bounds.

# Implementation

backend/app/ai/postflop_ai.py + board_texture.py.

# Acceptance Criteria

Postflop tests pass.

# Notes

Draws estimated heuristically, not exact equity (equity engine part 26 is for coach).
