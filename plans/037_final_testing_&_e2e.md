---
id: 037
title: Final Testing & E2E
phase: 4
status: planned
depends_on: [29, 34, 35]
test_file: e2e/tournament.spec.ts
implementation_files: [e2e/tournament.spec.ts]
---

# Objective

Final end-to-end verification: Playwright browser test of the full stack (start tournament, hero cards, opponents act, hero acts, flop/turn/river, showdown, chips update, next hand); full test suites; production frontend build; code-quality audit.

# Requirements

- e2e/tournament.spec.ts per spec section 77.
- All backend pytest + frontend vitest + e2e pass.
- Production build succeeds.
- File-line and structure audit passes.

# Dependencies

Parts 29, 34, 35.

# Tests

Playwright scenario; full suite reruns; audit script.

# Implementation

e2e/tournament.spec.ts, playwright.config.ts, scripts/audit.py.

# Acceptance Criteria

Full green suite + build; audit passes.

# Notes

Final gate before declaring the system done.
