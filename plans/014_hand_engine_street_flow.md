---
id: 014
title: Hand Engine (Street Flow)
phase: 1
status: complete
depends_on: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
test_file: backend/tests/game/test_hand_engine.py
implementation_files: [backend/app/game/hand_engine.py]
---

# Objective

Implement the hand engine: orchestrate a full 9-player hand — blinds, dealing, betting rounds (preflop/flop/turn/river), all-ins, showdown, pot distribution, winner, next-hand state.

# Requirements

- start_hand: rotate button, post blinds/antes, deal hole cards, first-to-act = UTG (preflop) / SB (postflop).
- Street flow: deal street, run betting round to completion (round ends when all remaining players matched bets or all folded/all-in).
- On fold-all-but-one: award pot without showdown.
- Showdown: reveal eligible hands, evaluate, split side pots.
- HandResult with winner(s), amounts, hole cards, community cards, actions.
- Hand engine uses dealer button, betting, side pot, evaluator modules.

# Dependencies

Parts 003-012 (all Phase 1 engines).

# Tests

Full hand simulations: heads-up to showdown, folds, multiway pots, side pots with all-ins, chip balance invariants (sum of stacks + pot = total).

# Implementation

backend/app/game/hand_engine.py with a TableState dataclass.

# Acceptance Criteria

Hand engine tests pass, chip conservation invariant holds in all simulations.

# Notes

This is the core playable simulation; AI plugs into it in phase 2 as a decision provider.
