---
id: 041
title: Bottom-Row Seat Repositioning (Bot 3 / Bot 4)
phase: 5
status: complete
depends_on: [15]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/styles/placement.css]
---

# Objective

Bottom-row seats (nth-child 3 & 4, and 5 for symmetry) sit too low and their
bets/status badges overlap the FOLD/CHECK/CALL/BET/RAISE area below the felt.
Move them upward toward the table, anchored by bottom so they stay fully above
the action controls on both desktop and mobile without enlarging the felt.

# Requirements

- Seats 3, 4, 5 remain completely above the action-control area.
- Position, name, stack, BB and status remain readable.
- Mobile table sizing preserved; no felt size change; responsive both breakpoints.

# Dependencies

Part 015 (seat placement), part 039/040 layouts.

# Tests

Playwright measures seat 3/4/5 bounding boxes vs felt bottom and controls top on
desktop (1280) and mobile (390): no overlap, no horizontal overflow.

# Implementation

placement.css: replace top percents with bottom anchors for nth-child 3, 4, 5.

# Acceptance Criteria

No seat or badge intersects the controls region on either viewport.
