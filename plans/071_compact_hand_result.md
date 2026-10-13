---
id: 071
title: Compact Hand Result Box
phase: 6
status: complete
depends_on: [10]
test_file: frontend/tests/features.test.tsx
implementation_files: [frontend/src/components/HandResult.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/styles/mobile.css]
---

# Objective

After every hand the player had to scroll down to click NEXT HAND: the
result panel stacked a coloured banner (result, username, chips), a line
with hand, pot and stack, the two buttons and the countdown, about 225px.
The owner asked for one box with only the result and the two buttons.

# Changes

- One box in the result's colour (green WON, red LOST, gold CHOPPED): the
  result and the chips on one line with "Next hand in N" (or PAUSED) under
  them on the left; REVIEW HAND and NEXT HAND on the right.
- Removed: the username, and the hand/pot/stack line (the hand number and
  pot are in the table header; the stacks are on the seats and in REVIEW
  HAND).
- Phones: the buttons wrap under the result.

# Results

Measured on a live local table: the box is 71px tall at 1280x650 (NEXT
HAND ends at 616px, no scrolling) and 117px at 375x740 (NEXT HAND ends at
669px, no scrolling). Frontend 261 passed; the new layout test failed
before the change.

# Found, not changed

On a 375px phone the table header buttons (MY MISTAKES, LOG OUT, pause)
cover the logo.
