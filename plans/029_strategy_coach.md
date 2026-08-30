---
id: 029
title: Strategy Coach
phase: 3
status: planned
depends_on: [22, 23, 24, 25, 26, 27, 28]
test_file: backend/tests/strategy/test_coach.py
implementation_files: [backend/app/strategy/coach.py, backend/app/strategy/coach_modes.py]
---

# Objective

Implement the dynamic strategy coach: combine all engines into a Recommendation for the current hero decision point; recalculates whenever state changes; never controls hero.

# Requirements

- Inputs: hero hand, position, stacks, blinds/antes, pot, board, actions, tournament/payout state.
- Outputs: RecommendedAction, Confidence, Reasoning, AlternativeAction, supporting analyses (chip EV, ICM EV, pot odds, SPR, board texture, stage, pressure, range matrix, push/fold).
- Recompute on every state change (no stale results).
- Coach modes: BEGINNER / INTERMEDIATE / ADVANCED with progressively detailed output.

# Dependencies

Parts 22-28.

# Tests

Recommendation for scripted decision points (preflop opens, 3-bet, jam calls, postflop), mode filtering, dynamic recalculation.

# Implementation

backend/app/strategy/coach.py + coach_modes.py.

# Acceptance Criteria

Coach tests pass; recommendation always legal for hero.

# Notes

Coach is advisory; hero acts via hero controls (part 16).
