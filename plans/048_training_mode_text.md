---
id: 048
title: Training Mode Text Color (White Bold)
phase: 5
status: complete
depends_on: [16]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/styles/pages.css]
---

# Objective

In Training Mode only, render "COACH MODE" and "TEST MODE" white and bold.
Visual-only; no behavior change.

# Implementation

CSS: .mode-card b { color: #fff; } (b is already bold).

# Acceptance Criteria

Text white+bold; mode selection, recommendations, grading, flow unchanged.
