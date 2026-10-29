---
id: 106
title: The Table Fits the Window
phase: 8
status: complete
depends_on: [101, 103]
test_file: frontend/tests/table_fit.test.tsx
implementation_files: [frontend/src/components/TableHeader.tsx, frontend/src/components/PokerTable.tsx, frontend/src/components/PokerSeat.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/components/HeroControls.tsx, frontend/src/components/BetSizer.tsx, frontend/src/components/HistoryDrawer.tsx, frontend/src/styles/felt.css, frontend/src/styles/seats.css, frontend/src/styles/controls.css, frontend/src/styles/bet-sizer.css, frontend/src/styles/table-desktop.css]
---

# Objective

The owner (28 Oct, after Phase 2 went live), from screenshots of icmbot.es in
a desktop browser about 650 px tall: the bet sizes and the slider fall below
the window, so placing a bet needs a scroll. The header, two status lines,
a felt sized by the page width and three rows of bet controls do not fit.
The opponents' seats are also small: names are cut by the photo, the stack
wraps onto two lines, the card backs are tiny and two seats overlap.

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic,
screens 16 to 18 (approve before building).

# Decisions

Wide screens (768 px and wider) and landscape phones, unless a point says
otherwise. The upright phone layout of plan 101 stays, except point 7.

1. No page scroll at the table: the table page is exactly the window's
   height (`100dvh`). The felt takes whatever height is left after the
   header, the status line and the controls, and keeps its oval shape
   (`aspect-ratio`), so a short window gives a smaller felt, never a scroll.
   Down to a window 600 px tall; below that the page may scroll.
2. A slimmer header at the table: 52 px, the logo 32 px high, the same
   buttons (HOME, MY MISTAKES, PAUSE, LOG OUT) a size smaller.
3. One status line: LEVEL and blinds, TIME, POT, with an "i" button and a
   History button at its right end, as on the phone (plan 101). The second
   line (HAND #, players, TOTAL CHIPS, AVERAGE STACK, LIVE HAND) shows only
   while "i" is on, over the top of the felt, and the choice is kept on the
   device (the same `icmbot.tableDetails` key as the phone).
4. Bet controls on two rows: the four action buttons; then the size buttons,
   the slider with its minus and plus, and the amount box on one row.
5. Hand history: closed by default; the History button opens it as a panel
   that slides in from the right over the table, 320 px wide, on a
   see-through dark background (the owner's idea) with a blur, so the felt
   stays visible behind it. It closes with its close button, Escape, a click
   outside and the History button. It has the phone drawer's two tabs
   (This hand, Last hands) and plan 100's lock line for Free. The right
   column it used is given to the felt.
6. The coach panel stays on the left, full height; a long panel scrolls
   inside its own box, never the page. HIDE still folds it, and then the
   felt takes that width too.
7. Bigger opponents' seats (all screens, the phone too where it fits): the
   seat box about 20% bigger; the photo sits beside the name, not over it;
   the name never cut for names up to 10 letters; the stack on one line
   ("45,000 · 112.5 BB", the BB part smaller); card backs about 30% bigger;
   seats never overlap at any width from 360 px up (seat positions checked
   at 360, 390, 768, 1024, 1280 and 1600 px).
8. On an upright phone, a tall screen's empty space under the bet controls
   goes to the felt (it grows until the controls reach the bottom).
9. Colours only as tokens (plan 103), in both themes; the see-through panel
   gets its own token for dark and light.

# Follow-up (the owner, 29 Oct, after it went live)

- Opponents still in the hand show bigger card backs (38 px on a phone,
  3.3em on wide screens, up from 30 px and 2.5em); folded players show none,
  so their seats stay short. The side seats moved apart a little (35% and
  72%) so a bet chip never sits on the next seat.
- Light theme: the status lines, the coach's row names, the ICM COACH and
  HAND HISTORY titles and the chosen history tab are darker and bolder
  (`--table-label` #2f2e2b at weight 700, `--panel-title` #6b4500); dark is
  unchanged. Both pairs are in the contrast test.
- The history tabs stay on one line, with the close button, on a 360 px phone.
- Upright phone, second pass the same day: the two seats beside the hero
  share the hero's tall row, so their backs grow up to 52 px (never wider
  than their box); the lower rows grow only on a tall phone (38 px up to
  860 px tall, then up to 46 px).
- No seat behind the bet buttons on an upright phone (the owner, 29 Oct):
  measured in the worst case (every opponent live, a flop out), a live
  bottom-row seat sat 41 to 81 px behind them at 360 x 780 and up to 221 px
  at 360 x 640. The felt now measures the page and shrinks just enough to
  fit (`hooks/useFeltFit.ts`, CSS `zoom`, down to 60%), and grows back when
  there is room. At 360 x 640 the 60% floor leaves a few pixels: the page
  scrolls there. `scripts/table-fit/phone.mjs` checks six phone sizes and is
  part of `check.mjs`.

# Tests

- At 1280 x 650, 1366 x 768 and 1440 x 900, dark and light: the page does not
  scroll, and the whole bet area (action buttons, sizes, slider, amount) is
  inside the window. Measured in a browser (Playwright), not in jsdom.
- "i" shows and hides the second line on wide screens and the choice is kept.
- History is closed by default; opens and closes the four ways; Free shows
  the lock line in Last hands.
- Seats: no two seat boxes overlap, and no name or stack is cut, at the six
  widths above (Playwright, bounding boxes).
- Every existing test passes; plan 101's phone tests still pass.
