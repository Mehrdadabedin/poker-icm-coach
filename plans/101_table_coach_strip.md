---
id: 101
title: Table with the Coach on Top
phase: 8
status: planned
depends_on: [087, 097, 100]
test_file: frontend/tests/coach_strip.test.tsx
implementation_files: [frontend/src/components/CoachStrip.tsx, frontend/src/components/TableDrawer.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/components/TableSidebar.tsx, frontend/src/components/MobileCoachCard.tsx, frontend/src/styles/table-phone.css, frontend/src/i18n/messages/en/table.ts, frontend/src/i18n/messages/es/table.ts]
---

# Objective

The owner (28 Oct): on a phone the coach card, the factor table and the hand
history push the felt up and off the screen (screenshot: ACTION, WHY,
POSITION ... BOARD TEXTURE fill the whole screen under the buttons). Move
the coach to one line at the top, open it only when asked, and give the
table the space.

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic, screens 5 to 8 (approve before
building).

# Decisions

- Phone layout, top to bottom: table header (one line), coach strip, felt,
  action buttons with the bet sizes. Nothing scrolls during a hand.
- Coach strip: one line, the coach's action in its colour and the reason,
  for example "RAISE · T9s is in the CO open range". CO, SPR and the other
  terms in it stay tappable (plan 097). The line is cut with an ellipsis
  when it is too long.
- Tapping the strip (or "Why?") opens the coach sheet over the felt: the full
  reason and the factor rows (POSITION, STACK, EFFECTIVE STACK, POT ODDS,
  ICM PRESSURE ...), each row label tappable for its glossary definition as
  today. The sheet closes with a tap outside, the close button, Escape or
  the Android back button. The owner said "mouse over": a phone has no
  hover, so it is a tap; on a computer, hovering the strip also opens it.
- The strip remembers open or closed per player, like the coach toggle the
  table already has (`coachHidden`). Closed, it shrinks to a small "Coach"
  chip at the top right.
- Hand history moves into a drawer: a "History" chip at the top opens it
  from the bottom over the felt, with this hand's actions and the last
  hands. Closed by default.
- The grade after an action (PREFERRED, ACCEPTABLE, SUBOPTIMAL) shows in the
  strip for 3 seconds instead of a banner over the felt.
- Free players (plan 100): the strip is a locked chip, "ICM coach · Pro",
  that opens the Upgrade sheet. No advice is fetched. The History chip shows
  a lock too, since hand history is Pro (plan 100). Each bot's seat ring
  shows its style (tight or loose, aggressive or passive), with a key under
  the felt, because a Free player did not choose the lineup.
- Wide screens keep today's side panels. Landscape phones (plan 089) keep
  their layout; this plan is for a phone held upright.

# Tests

- On a 360 x 780 screen the felt, all 9 seats and the action buttons are
  inside the screen without scrolling, with the strip closed and open.
- The strip shows the action and reason; a tap opens the sheet with every
  factor row; CO in the strip opens the glossary definition, not the sheet.
- The sheet closes with outside tap, close button and Escape; the choice
  is remembered.
- History drawer opens and closes and lists this hand's actions.
- Free: the locked chip shows, no coach request is made, a tap opens the
  Upgrade sheet.
