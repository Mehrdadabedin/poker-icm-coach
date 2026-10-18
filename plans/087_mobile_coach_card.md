---
id: 087
title: Coach Card on Phones
phase: 7
status: complete
depends_on: [84]
test_file: frontend/tests/mobile_coach_card.test.tsx
implementation_files: [frontend/src/components/MobileCoachCard.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/components/PokerTable.tsx, frontend/src/styles/coach-mobile.css]
---

# Objective

On a phone the coach panel sits below the table, a long scroll away from the
betting buttons. The owner chose option A of two mock-ups: a coach card at the
top of the table that shows on the hero's turn and goes away after acting.

# Change

- A card first on the felt: "ICM COACH · street", the action in its button
  colour (fold red, call and check green, raise and bet gold, all-in purple),
  the coach's one-line reason, and Details for the same rows as the panel.
- Shown only while it is the hero's turn, no action is being sent, the hand is
  not over, and the advice is for the current street. Old advice never shows.
- Preflop the empty board strip ("DEALING…") gives its place to the card.
  Postflop the card sits above the board, so the board stays visible.
- Portrait phones only (767px wide or less). Desktop, tablets and landscape
  phones keep the side panel alone.

# Checked

Local table at 360x780: flop, card above the board, 75px tall closed and 345px
with Details (14 rows), no sideways scroll; preflop the card replaces the empty
board strip; after CALL the card left within 130 ms and came back with the next
street's advice. At 1024px the card is hidden and the board shows. Removing the
"action on its way" and "current street" conditions fails 2 of the 9 new tests.
