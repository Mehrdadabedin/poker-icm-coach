---
id: 039
title: Header Layout + Icon Pause/Play Control
phase: 5
status: complete
depends_on: [38]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/pages/TablePage.tsx, frontend/src/styles/base.css]
---

# Objective

Restructure the table-screen header to:

    [ HOME ] [ ⏸ ]                         ICM MASTER

HOME + pause/play icon on the LEFT, title on the RIGHT. Replace every
"NEXT HAND" text button with an icon-only pause/play control (⏸ pauses the
auto-next countdown, ▶ resumes). Default state is automatic progression.

# Requirements

- Header identical on desktop and mobile; no clipping; no overlap.
- Pause stops the countdown, keeps hand review visible; icon becomes ▶.
- Play resumes countdown and starts the next hand; icon becomes ⏸.
- Accessible title: "Pause automatic next hand" / "Resume automatic next hand".
- Works with mouse and touch.
- No "NEXT HAND" text button anywhere.
- No duplicate timers; timers cleaned up on pause/resume/phase change.

# Dependencies

Part 038 (name), existing auto-next-hand countdown in TablePage.

# Tests

Vitest header assertions; Playwright: pause freezes countdown, play resumes,
icon switches, no console errors.

# Implementation

TablePage header JSX + base.css responsive header styles.

# Acceptance Criteria

Header layout verified on desktop and mobile viewports; pause/play toggles work.
