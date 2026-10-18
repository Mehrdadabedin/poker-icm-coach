---
id: 084
title: Bigger Cards on Phones
phase: 7
status: complete
depends_on: [81]
test_file: frontend/tests/mobile_cards.test.ts
implementation_files: [frontend/src/styles/mobile.css, frontend/src/styles/bet-sizer.css, frontend/src/components/HeroControls.tsx]
---

# Objective

The owner found the cards and the board hard to see on a phone. The Android
app (plan 083) shows the same pages, so it would not help by itself.

# What it was

In the portrait phone layout (767px wide or less) the board cards were 32px
and the hero's 40px, while other seats' face-down cards were 34px: the cards
a player reads were the smallest.

# Change

- Board 56px, or as wide as five cards fit on very narrow phones.
- Hero cards 60px, overlapped by 26px so the hero's seat stays 104px wide and
  three seats still fit a row; each card's corner (rank and suit) shows.
- The bigger cards made the table about 90px taller, so on phones the betting
  controls stay at the bottom of the screen while the table scrolls under.
- The "· Enter" hint is hidden on touch screens (no Enter key), which keeps
  the yellow button to two lines.

# Checked

Local table at 360x780 and 412x915: board 56px, hero cards 60px, three rows
of seats, no sideways scroll; at 360x780 the whole controls panel shows at
the bottom (it ended at 820px, below the screen, before the bar); at 412x915
nothing overlaps. Desktop, tablets and landscape phones use other rules and
are unchanged. Frontend 309 passed.
