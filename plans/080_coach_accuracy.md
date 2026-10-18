---
id: 080
title: Coach Accuracy (next phase)
phase: 7
status: in-progress
depends_on: [72, 73, 74]
test_file: backend/tests/test_coach_benchmark.py
implementation_files: [backend/tests/benchmark/build.py, backend/tests/benchmark/export.py, backend/app/strategy/allin_preflop.py, backend/app/strategy/short_stack.py, backend/tests/benchmark/nash.py, backend/tests/benchmark/equity_table.py, backend/tests/benchmark/spots.py, backend/tests/data/coach_benchmark.json, backend/app/ai/preflop_ranges.py, backend/app/strategy/baseline_ranges.py, backend/app/strategy/coach.py, backend/app/strategy/test_mode.py]
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

A. **Measure first (done, 15 Oct).** See "Step A: benchmark" below.
B0. **Short stacks, from step A (done, 18 Oct; see "Step B0" below).** Use our own Nash results for
   small blind shoves and big blind calls at 20 BB and less; read a small
   blind shove as a shoving range, not an open; drop the 6% margin when
   calling an all-in (no betting is left); price bubble calls with ICM.
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

# Step A: benchmark

The owner chose maths as the judge, with nothing copied from any book or
other source. `uv run python -m tests.benchmark.build` writes
tests/data/coach_benchmark.json from our own code:

- An all-in equity table for the 169 hand classes, simulated (3,000
  showdowns per pair, 16 minutes on 4 cores, cached, not committed).
- Heads-up push/fold Nash (chip EV) solved by fictitious play: at 10 BB the
  small blind shoves 58.1% and the big blind calls 37.6%.
- Big blind calls on a three-handed bubble (two paid), priced with the exact
  ICM model against the small blind's Nash shoving range.
- 204 spots: per stack, the six hands nearest the edge on each side; hands
  whose two choices differ by less than 0.1 BB (0.3% of the prize pool on
  the bubble) are close calls and left out.

Checked, not copied: the solver's per-hand thresholds were compared once
with a published heads-up push/fold table (read in the browser, kept in a
temporary file, then deleted). Calls: 169 of 169 hands within 0.75 BB;
shoves: 147 of 153, the rest are suited hands where shove and fold are
nearly equal.

Coach scores today (the test's floors; a coach change may raise them, never
lower them):

| Category | Right | Lost on misses |
|---|---|---|
| Small blind shove, 3-10 BB | 36/72 (50%) | 4.57 BB |
| Big blind call vs shove, 4-20 BB | 42/84 (50%) | 10.53 BB |
| Bubble call (ICM) | 27/48 (56%) | 12.50% of prize pool |

The coach folds almost every spot near the edge. Over all hands:

| Spot | Maths plays | Coach plays | Same answer |
|---|---|---|---|
| Small blind shove, 3 BB | 76.8% | 21.3% | 44.5% |
| Small blind shove, 10 BB | 57.8% | 18.1% | 60.3% |
| Big blind call, 4 BB | 74.1% | 13.9% | 39.8% |
| Big blind call, 20 BB | 21.7% | 5.1% | 83.4% |

Causes, from the coach's own reasons: its small blind jam range is about
20% at every depth ("84o is not in the SB jam range" at 3 BB); a small
blind shove is read as an opening range, so the caller's equity is
underestimated; calls need pot odds plus 6% even when all-in; ICM only
changes the wording, not the call.

# Step B0: short stacks (18 Oct)

`uv run python -m tests.benchmark.export` writes app/strategy/data/
allin_preflop.json (92 KB): heads-up Nash shoving and calling ranges for 2 to
20 BB and the class-against-class equity table, from the same solver.

- Folded to the small blind at 10 BB effective or less: shove or fold by Nash
  at the nearest solved depth. The effective depth counts the big blind.
- Heads-up against an all-in: equity from the table (the live simulation was
  out by about 3 points; the edge is 0.5 point), a small blind shove read as
  the Nash shoving range, a call at the pot odds with no margin, and ICM when
  two or more places are paid. A call that puts the hero all-in is ALL-IN.
- ICM had a bug: the shover's chips vanished in every outcome, as if the
  shover were out. The pot now goes to whoever wins it.

| Category | Step A | Step B0 |
|---|---|---|
| Small blind shove | 36/72 | 72/72 |
| Big blind call | 42/84 | 84/84 |
| Bubble call (ICM) | 27/48 | 48/48 (chips alone: 24/48) |

The coach now uses the solver the benchmark is built with, so the first two
rows confirm the wiring, not the maths. The bubble row also checks the ICM
pricing. Not covered: open shoves from other positions (multi-way, still the
old ranges), small blind play from 11 to 20 BB (raise or fold), all-ins with
more than one opponent, and ICM for the small blind's own shove.

# Not planned

An AI model making the decisions: slower (plan 074 made the coach 7 times
faster), different answers to the same spot, a cost on every decision, and
hard to test.
