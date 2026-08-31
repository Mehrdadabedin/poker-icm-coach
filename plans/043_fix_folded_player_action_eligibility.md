---
id: 043
title: Fix Folded-Player Action Eligibility + Showdown Reveal
phase: 5
status: complete
depends_on: [14]
test_file: backend/tests/game/test_hand_engine.py
implementation_files: [backend/app/game/hand_engine.py]
---

# Objective

A folded player (Hero or bot) must be permanently out of the current hand:
never the active player again, never able to CHECK/CALL/BET/RAISE/ALL-IN,
never eligible to win the pot, and never evaluated in showdown.

# Root Cause

After a street completes, HandEngine._next_street_or_showdown rebuilt the
action queue from active_seats (which excludes eliminated/sit-out only), so
FOLDED players re-entered the queue on the flop/turn/river and could become
current_actor again.

# Fix

- Build the new-street queue from in_hand_seats (excludes folded).
- HandEngine.act() raises ValueError if the actor already folded (authoritative
  lock; bots enter via advance_bot -> act, so the guard covers them too).
- Showdown/settle already receives in_hand (non-folded) eligibility and keeps
  folded chips in the pot without letting folded players win; unchanged.

# Tests

Deterministic multi-street hand: folded seats never act again, are skipped on
the flop, cannot call/check/bet/raise/all-in (ValueError), hero-fold hand
resolves among live bots with 5-card board + showdown reveal, winner from live
players, pot conservation, next hand starts.

# Acceptance Criteria

Backend suite green; no folded player can be current_actor; hero fold still
completes hands with correct reveal/winner.

# Notes

UI/hand review already keyed off the authoritative state (foldedSeats, showdown
from result.showed_down) and needed no changes.
