---
id: 049
title: ICM Coach Card Analysis (169 Classes + Exact Cards)
phase: 5
status: complete
depends_on: [29]
test_file: backend/tests/strategy/test_hand_classes.py
implementation_files: [backend/app/strategy/hand_classes.py, backend/app/api/routes_game.py, frontend/src/pages/CoachPage.tsx]
---

# Objective

Extend ICM Coach to analyze any of the 169 starting-hand classes (AA..22,
AKs..32s, AKo..32o) and exact two-card combinations from the 52-card deck
(duplicate physical cards prevented).

# Implementation

- Backend GET /api/coach/hands returns all 169 classes with a representative
  card combo each.
- CoachPage gains a mode toggle: STARTING HAND (169 select) or EXACT CARDS
  (two rank+suit pickers, duplicate prevention).
- Existing /api/coach/advice unchanged; heroCards already accepted.

# Acceptance Criteria

AA, 22, AKs, offsuit hands and exact combos all analyze; duplicate card
selection impossible.
