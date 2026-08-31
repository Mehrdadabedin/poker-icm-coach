---
id: 045
title: Swap Table Header Position (ICM Master left, Controls right)
phase: 5
status: complete
depends_on: [044]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/pages/TablePage.tsx, frontend/src/styles/base.css]
---

# Objective

Swap the table-screen header positions: "ICM MASTER" moves to the LEFT and the
HOME + Pause/Play button group moves to the RIGHT. Pure positioning change; no
button appearance, behavior, functionality, or other UI is modified.

# Changes

- TablePage.tsx: reorder header children (title first, buttons second);
  rename header-left group class to header-right.
- base.css: .header-left -> .header-right selector; .header-title text-align
  right -> left.

# Dependencies

Part 044 (balanced buttons, unchanged).

# Tests

Vitest suite; Playwright header geometry on 1280/1024/760/390: title leftmost,
HOME before Pause, both right of title, 48px each, no overflow; Home and
Pause/Play behavior unchanged.

# Acceptance Criteria

LEFT: ICM MASTER - RIGHT: HOME, Pause/Play. Nothing else changed.

# Notes

Header container stays centered on desktop (max-width 720px) exactly as before.
