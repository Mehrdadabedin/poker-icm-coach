---
id: 009
title: Betting Engine
phase: 1
status: planned
depends_on: [4]
test_file: backend/tests/game/test_betting.py
implementation_files: [backend/app/game/betting.py, backend/app/game/actions.py]
---

# Objective

Implement the betting engine: legal actions FOLD/CHECK/CALL/BET/RAISE/ALL-IN with correct amount-to-call, min-raise, and current bet tracking.

# Requirements

- Track current street bet, player contributions.
- amount_to_call(player, current_bet, contribution) computed per player.
- min_raise = last raise size (no-limit rule).
- Legal action set computed from state (check allowed only when no bet to call).
- All-in allowed whenever chips remain; bet capped at stack.
- Action validation rejects illegal actions.

# Dependencies

Part 004.

# Tests

Preflop/postflop scenarios: limps, raises, min-raise math, all-in short of min-raise, illegal check when facing a bet.

# Implementation

backend/app/game/actions.py + betting.py.

# Acceptance Criteria

Betting tests pass.

# Notes

Betting engine is stateless helpers; hand engine drives state transitions.
