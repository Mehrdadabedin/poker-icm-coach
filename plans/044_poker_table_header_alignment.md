---
id: 044
title: Poker Table Header Alignment (HOME / Pause / ICM Master)
phase: 5
status: complete
depends_on: [39]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/styles/base.css]
---

# Objective

Balanced top bar: [ HOME ] [ Pause ] on the LEFT, ICM MASTER on the RIGHT,
consistent across desktop/mobile/portrait/landscape.

# Fix

- HOME and the Pause/Play icon share the same height (48px) and vertical
  alignment (inline-flex centering) so the left group looks balanced.
- Title keeps flex:1 + text-align:right (already right-aligned).
- No behavior, colors or functionality changes.

# Tests

Vitest + Playwright layout checks on desktop (1280) and mobile (390):
HOME left of Pause, Pause left of title, title right-aligned, no overflow.

# Acceptance Criteria

Balanced left buttons; title on the right; no overlap; existing Home and
Pause/Play behavior unchanged.
