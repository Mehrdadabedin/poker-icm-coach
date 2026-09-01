---
id: 058
title: ICM Coach Decision / EV Consistency
phase: 5
status: complete
depends_on: [51, 52]
test_file: backend/tests/strategy/test_coach.py, backend/tests/strategy/test_ev.py
implementation_files: [backend/app/strategy/coach.py, backend/app/strategy/coach_analysis.py, backend/app/strategy/coach_ev.py, backend/app/strategy/ev.py]
---

# Objective

The ICM Coach must present ONE consistent decision model: the recommendation,
chip EV, ICM EV, alternative action and explanation must all refer to the same
action and comparison baseline.

# Root Cause

- _icm_overlay ran unconditionally in analyze_request and always computed
  CALL-vs-FOLD ICM EV, even when the recommendation was RAISE/3-BET.
- fold_stack was computed as hero_current - to_call (folding should keep the
  current stack), understating fold equity.
- Preflop win probability was 0 (a.equity never set preflop), so call EV was
  always ~0 -> "NEGATIVE (fold 0.111 vs call ~0.000)".
- a.chip_ev stayed the stale default "NEUTRAL" while rec.ev held the real
  chip EV - two different values displayed.

# Fix

- analyze_request keeps only a preliminary ICM signal (class + fold equity)
  for the decision's internal note.
- After the decision, coach_ev.icm_ev_for computes the ICM EV of the DECIDED
  action vs FOLD (correct fold baseline, real win probability) and labels it
  e.g. "RAISE vs FOLD: POSITIVE (fold 0.111 vs raise 0.145)".
- chip_ev_for is decision-aware (risk = to_call for CALL/FOLD, raise amount
  for RAISE/3-BET/RESHOVE/OPEN JAM/ALL-IN) and labels the action.
- ev.py ChipEV carries the action; chipRecommendation matches the decision.
- _build_detail shows the decision-consistent ICM EV and chip EV.

# Acceptance Criteria

A RAISE recommendation cannot display a CALL-vs-FOLD ICM EV; labels, sign,
baseline and recommendation all refer to the same action.
