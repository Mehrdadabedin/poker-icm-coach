---
id: 089
title: Phone Menu and Sideways Table
phase: 7
status: complete
depends_on: [84, 87]
test_file: frontend/tests/table_landscape.test.ts
implementation_files: [frontend/src/components/TableMenu.tsx, frontend/src/components/TableHeader.tsx, frontend/src/components/PokerTable.tsx, frontend/src/styles/table-menu.css, frontend/src/styles/table-landscape.css, frontend/src/styles/coach-mobile.css]
---

# Objective

The owner, on the Android app (18 Oct): a ☰ menu at the top left instead of
the header buttons; held sideways, more room, readable cards, and the coach
card.

# Before (850x390, a phone held sideways)

The header took 52px plus two 15px rows, the table 697x288, and the buttons
started at 382px, below the screen. The coach card was hidden. Hero cards
were 24px wide, the board 38px. Held upright the header buttons took a
second row.

# Change

- Phones (959px or less): ☰ at the top left of the table header opens HOME,
  MY MISTAKES, PAUSE NEXT HAND and LOG OUT. Only the table header changes.
- Sideways: a slim header, the table on the left at full height, and a
  column on the right with the coach card, the buttons, the size presets
  and the slider. Hero cards 44px, board 42px, seats wide enough for names.
- The coach card renders before the felt, not inside it, so the sideways
  grid can place it; upright it sits just above the table.

# Checked

Browser at 850x390: header 38px, table 519x324, coach card and buttons on
the right, the flop at 42x59px, all on one screen, no sideways scroll; the
hand result in the right column. 740x360 fits too. 390x844 upright: one
header row (53px). 1024px desktop: unchanged. Frontend 339 passed (12 new).

Not checked on the owner's phone.
