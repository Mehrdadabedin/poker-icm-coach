---
id: 052
title: Probability / Outs Calculation
phase: 5
status: complete
depends_on: [51]
test_file: backend/tests/strategy/test_outs.py
implementation_files: [backend/app/strategy/outs.py, backend/app/strategy/coach.py]
---

# Objective

Postflop: compute actual outs (cards that improve hero's hand) from the real
remaining deck (47 after flop, 46 after turn), probability of improving, and
winning probability (equity estimate / Monte Carlo vs random or explicit
opponent cards). Distinguish "making a hand" from "winning the hand".

# Implementation

- strategy/outs.py enumerates remaining cards, counts improving cards, and
  returns improve probability (turn/river) plus win probability via
  equity_engine.hero_vs_random (or hero_vs_hand when opponent cards given).
- Coach response gains outs/improveProb/winProb.

# Acceptance Criteria

Outs and probabilities computed from actual cards; no hard-coded generic
probabilities when exact cards are known.
