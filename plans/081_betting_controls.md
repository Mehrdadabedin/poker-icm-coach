---
id: 081
title: Betting Controls
phase: 7
status: complete
depends_on: [16]
test_file: frontend/tests/bet_sizer.test.tsx
implementation_files: [frontend/src/models/betSizing.ts, frontend/src/components/BetSizer.tsx, frontend/src/components/HeroControls.tsx, frontend/src/hooks/useHeroKeys.ts, frontend/src/components/LiveTableView.tsx, frontend/src/styles/bet-sizer.css, frontend/src/styles/controls.css]
---

# Objective

The owner found betting awkward: a raise took three steps (RAISE, type or
pick an amount, CONFIRM), the POT button made no sense before the flop, and
Enter did nothing. The owner approved a mock-up on 16 Oct and asked for FOLD
to be greyed out when checking is free.

# Change

- Sizes show as soon as it is the hero's turn; the yellow button shows the
  exact amount ("RAISE TO 750, 7.5 BB") and plays it. Two taps, or a tap
  and Enter.
- Preflop in big blinds: first in 2x, 2.5x, 3x; facing a raise 3x, 3.5x,
  4x of it; facing a 3-bet 2.2x, 2.5x; plus All-in. No pot button.
- After the flop, shares of the pot: 1/3, 1/2, 2/3, Pot. A raise uses
  pot-size maths (call, then raise by the pot after the call); the old POT
  button only copied the pot number.
- - and + (or the arrow keys) move one big blind preflop, 5% of the pot after
  the flop; the slider and the amount box stay for exact sizes.
- Keys: Enter plays the size, F folds, C calls, K checks; keys typed into a
  field stay there; Enter after tapping a size plays it.
- FOLD is greyed out when checking is free ("Checking is free").
- Raises are counted from the hand's action log; sizes stay inside the
  engine's minimum and maximum; reaching the maximum plays an all-in.

# Tests

- frontend/tests/bet_sizer.test.tsx (11): presets for first in, facing a
  raise and facing a 3-bet; postflop shares and pot-size raise maths;
  limits; all-in; Enter, F, C, K, arrows; keys ignored when it is not the
  hero's turn; Enter after a tapped size (failed without the fix).
- frontend/tests/controls.test.tsx: FOLD greyed out when checking is free;
  the yellow button replaces CONFIRM.
- Checked on a local table: tap 3x then Enter raised to 300; on the flop
  facing 550 the pot raise was 2,750; F folded, C called; FOLD greyed out
  with CHECK and BET 200 (1/2 pot); 375px wide on a phone.

# Not changed

Open raises do not add a big blind per limper yet.
