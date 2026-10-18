---
id: 086
title: Coach SPR Is Stack Over Pot
phase: 7
status: complete
depends_on: [80]
test_file: backend/tests/strategy/test_coach_spr.py
implementation_files: [backend/app/strategy/coach_analysis.py]
---

# Objective

The owner's phone screenshot (18 Oct) showed SPR 0.8 for a 108 BB stack.

# Cause

`spr` was the pot divided by the big blind, not the stack-to-pot ratio. The
panel showed the wrong number, and the postflop rule "bet with 50% equity
when SPR is 3 or less" really fired when the pot was 3 big blinds or less:
it bet medium hands into small pots with deep stacks, and checked them when
stacks were short against a big pot.

# Change

SPR is the effective stack (the hero against the biggest other stack)
divided by the pot.

# Tests

backend/tests/strategy/test_coach_spr.py (3): SPR 5.0 for 10,000 behind a
2,000 pot (was 10.0) and 145.2 for the screenshot (was 0.8); a 55% hand
checks with SPR 50 (bet before) and bets with SPR 1.5 (checked before). All
three failed before the fix. The landing quiz spot now reads SPR 0.6 (it
pinned 24.0); the site does not print it. Backend 690 passed; the coach
benchmark (preflop) is unchanged.
