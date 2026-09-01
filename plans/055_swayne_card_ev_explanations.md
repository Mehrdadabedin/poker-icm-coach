---
id: 055
title: Swayne-Based Card/EV Explanations
phase: 5
status: complete
depends_on: [51, 52]
test_file: backend/tests/strategy/test_education.py
implementation_files: [backend/app/strategy/education.py, backend/app/strategy/coach.py]
---

# Objective

Add concise educational explanations to ICM Coach based on Swayne concepts
(169 classes, exact combos, card strength, opponents, position, pot size,
probability, outs, pot odds, EV, positive/negative EV, making vs winning a
hand). No book text copied.

# Implementation

- strategy/education.py builds 1-2 sentence context-aware explanations from
  the analysis; coach response gains education field; UI renders it.

# Acceptance Criteria

Explanations are concise, accurate to the actual hand state, and do not
replace the existing recommendation.
