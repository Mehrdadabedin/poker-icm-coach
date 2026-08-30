---
id: 016
title: Hero Controls
phase: 1
status: planned
depends_on: [15]
test_file: frontend/tests/controls.test.tsx
implementation_files: [frontend/src/components/HeroControls.tsx]
---

# Objective

Implement Hero controls: FOLD/CHECK/CALL/BET/RAISE/ALL-IN, mobile-friendly, only legal actions offered, live pot/call/raise info, hero stack.

# Requirements

- Determine legal actions from game state (betting rules).
- Large tap targets (>= 48px).
- BET/RAISE show amount inputs with min/max.
- CALL shown with amount to call; CHECK when facing no bet.
- Disabled/hidden states while waiting or observing.
- Emits typed HeroAction.

# Dependencies

Part 015.

# Tests

Legal action matrix rendering, bet sizing limits, call amount label, action callback payload.

# Implementation

frontend/src/components/HeroControls.tsx + styles.

# Acceptance Criteria

Control tests pass.

# Notes

Frontend mirrors backend legality rules; backend re-validates.
