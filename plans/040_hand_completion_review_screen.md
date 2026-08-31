---
id: 040
title: Hand Completion Review Screen (Poker Hand History)
phase: 5
status: complete
depends_on: [39]
test_file: frontend/tests/table.test.tsx, backend/tests/services/test_hand_review.py
implementation_files: [frontend/src/pages/TablePage.tsx, frontend/src/components/HandReview.tsx, backend/app/services/hand_review.py]
---

# Objective

When a hand completes, hide the poker table and show a full "POKER HAND
HISTORY" review screen: result at the very top, hand facts, showdown hands,
structured bot action history, bot decision explanations, ICM coaching and the
auto-next countdown. The table reappears when the next hand begins.

# Requirements

- Result banner (YOU WON / YOU LOST / CHOPPED + chips) at the very top.
- Hand info: hand number, hero position, hero cards, final board, pot, stack
  before/after, chip change, stack rank, ICM pressure, winning hand, result.
- SHOWDOWN HANDS: winner cards + hand name + WON/LOST badge; folded players
  shown as "FOLDED — Hand not revealed" (never fake reveals).
- Bot action history grouped by PRE-FLOP / FLOP / TURN / RIVER.
- Existing bot explanations + ICM coaching kept.
- Auto-next countdown continues; PAUSED state keeps the review visible.
- Table hidden/disabled during review; re-enabled automatically for the new hand.

# Dependencies

Part 039; backend review payload already provides showdown/actions/explanations.

# Tests

Backend: review includes heroCards + per-showdown won flag. Playwright: table
hidden during review, result at top, showdown WON/LOST correct, folded never
revealed, table returns after auto-next.

# Implementation

TablePage renders HandReview instead of PokerTable during handOver; HandReview
adds title, hand number, hero cards, WON/LOST badges, ActionHistory inline.

# Acceptance Criteria

Full lifecycle ACTIVE HAND -> table -> review screen -> auto-next -> table.
