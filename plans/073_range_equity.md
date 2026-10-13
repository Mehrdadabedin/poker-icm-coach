---
id: 073
title: The Coach Prices Decisions Against the Opponent's Likely Hands
phase: 6
status: complete
depends_on: [72]
test_file: backend/tests/strategy/test_villain_range.py
implementation_files: [backend/app/strategy/villain_range.py, backend/app/equity/equity_engine.py, backend/app/strategy/coach_analysis.py, backend/app/strategy/coach.py, backend/app/services/session_coach.py, backend/app/services/bot_review.py, backend/app/strategy/hand_codec.py]
---

# Objective

Step 2 of more precise coaching (step 1: plan 072). The coach priced every
decision against a random hand, and preflop facing a raise against a fixed
bucket table. Reported by the owner from My Mistakes:

- QJo facing a raise: "QJo equity ~20%" (every offsuit hand without an ace or
  king got 20%).
- Top pair on Qc9c8s2c facing a turn bet: "Equity 74% beats pot odds 33%",
  RAISE; two pair on the river: 78%, RAISE.

# Changes

- **Who the opponent is.** `read_villain` reads the hand's action log: the
  opponent still in the hand who bet or raised last (this street first), else
  the last to act; their position; their preflop line (open, 3-bet, call, or
  passive when they only limped or checked a blind); whether they bet or
  raised on this street. `coach_request` passes it as `CoachRequest.villain`.
- **What they likely hold.** Open: their position's opening range. 3-bet:
  JJ+, AQs+, AKo, KQs, A5s, A4s. Call: their range without QQ+/AK. Passive:
  any two cards. After the flop each combo is weighted by how it fits the
  board: made hand (two pair+, or a pair using a hole card) 1.0; draw (four
  to a flush or a straight with a hole card) 0.7 when they bet, 0.8 when
  not; air 0.2 when they bet, 0.6 when not.
- **Equity.** `win_probability_for`, the one number the coach uses for its
  decision, the outs report and ICM EV, is now equity against those
  weighted combos (3,000 trials, cached per spot). With no opponent to read
  it falls back to the old method.
- **Preflop facing a raise** uses that equity instead of the bucket table.
- **Raising for value after the flop** now also needs at least 65% against
  the opponent's range: a raise is called mostly by the stronger part of it.

# Bugs found and fixed on the way

- `range_combos` (was `_range_combos`) never produced a pocket pair: it
  looked for two cards of one rank and one suit. Every range used for
  push/fold calling silently had no pairs.
- `parse_shorthand` expanded "A2s+" one rank too far, adding "AAs", "KKs",
  "AAo"... to every opening range (separate commit).

# Results

| Spot | Before | Now |
|---|---|---|
| QJo vs UTG / CO / BTN open | 20% | 38% / 43% / 46% |
| AA vs UTG open | - | 84% |
| JQ top pair, Qc9c8s2c, facing a bet | 74%, RAISE | 64%, CALL |
| JQ two pair after Jd, facing a bet | 78%, RAISE | 63%, CALL |

QJo now folds to an UTG raise (38% < 44% needed) and calls a button raise
from the big blind. A coach answer takes 0.35s at the median and 0.42s at
worst over 48 decisions on the development machine; Render's free instance
is slower.

# Tests

backend/tests/strategy/test_villain_range.py (6) and test_hand_codec.py (3).
With the opponent read switched off, the two coach tests fail with "QJo
equity ~20%" and "Equity 74% beats pot odds 33%". Backend 658 passed.

# Not done (step 3)

Preflop charts by position and stack (open, call, 3-bet, push/fold)
computed for ICM; position and implied odds in the calling decision;
multiway pots (the coach reads one opponent).
