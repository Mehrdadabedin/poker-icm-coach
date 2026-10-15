---
id: 080
title: Coach Accuracy (next phase)
phase: 7
status: planned
depends_on: [72, 73, 74]
test_file: backend/tests/test_coach_benchmark.py
implementation_files: [backend/app/ai/preflop_ranges.py, backend/app/strategy/baseline_ranges.py, backend/app/strategy/coach.py, backend/app/strategy/test_mode.py]
---

# Objective

Make the coach's decisions more precise without slowing it down or paying
per decision. The owner's example (My Mistakes, 15 Oct): QTo raised from HJ
at 29 BB was a "mistake" because "QTo is not in the HJ open range", and the
hand was won. Winning does not make a decision right (plan 070), but a hand
at the edge of a range should not be graded like a clear error.

# What the code does today (read 15 Oct)

1. Open ranges have five depth bands: 5, 8, 12, 20, 30 BB. A stack uses the
   closest shallower band, so 29 BB uses the 20 BB chart (HJ 210 combos
   instead of 294 at 30 BB), and 100 BB or 450 BB use the 30 BB chart.
2. A hand outside the chart is FOLD at 100%. There is no edge: one combo
   past the line is graded the same as 72o.
3. Limped pots count as unopened (`facing_raise` is "bet above the big
   blind"), so the advice is open-raise or fold and the reason talks about
   the "open range" when the hero faced limpers.
4. Facing a raise: only 7 premium hands 3-bet; every other hand calls or
   folds on equity against the raiser's range plus a fixed 6% margin. No
   position, no set-mining when deep, no light 3-bets.
5. Postflop: bet at 62% equity or more, call at pot odds plus 8%, raise at
   65%. No semi-bluffs with draws, no implied odds, no position or
   initiative (c-bet), no bet size.
6. Reasons give no numbers on how close a spot was.

# Plan, in order (each step one pull request)

A. **Measure first.** A benchmark of about 200 reference spots with expected
   actions, from sources the project may use: the Swayne study notes, push
   and fold (Nash) charts for 15 BB and less, published open charts. A test
   prints agreement by category; every later step must raise it.
B1. **Close decisions.** Hands within a few combos of a range edge grade
   ACCEPTABLE either way, and the panel says "close decision". Small.
B2. **More depth bands:** 10, 15, 20, 25, 30, 40, 60, 100+ BB, with deep
   charts that favour suited and connected hands over offsuit ones.
B3. **Limped pots:** isolation raise, over-limp from late position, check
   from the big blind; reasons that name the limp.
C2. **Bet size advice** (1/3, 1/2, 2/3, pot) by board texture and hand
   strength. It pairs with the Report's Bet sizes card (plan 079): later the
   card can compare the player's size with the coach's.
B4. **Facing a raise:** 3-bet ranges by position against the opener's
   position; calls that use position and stack depth.
C1. **Draws:** semi-bluffs and implied odds.
C3. **Preflop raiser:** c-bet logic by board and position.
D. **Optional plain-language reasons:** the decision stays rule-based; an
   AI model (Haiku via the monthly API credit) rewrites the reason only for
   hands opened in My Mistakes, not every decision. Roughly 1,500 input and
   200 output tokens each, well under a cent; check the price first.

# Not planned

An AI model making the decisions: slower (plan 074 made the coach 7 times
faster), different answers to the same spot, a cost on every decision, and
hard to test.
