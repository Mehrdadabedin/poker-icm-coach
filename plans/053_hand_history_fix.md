---
id: 053
title: Hand History Auto-Table + Blind-Level Grouping
phase: 5
status: complete
depends_on: [31]
test_file: backend/tests/services/test_hand_history.py
implementation_files: [backend/app/services/hand_history.py, backend/app/api/routes_meta.py, frontend/src/pages/HistoryPage.tsx]
---

# Objective

Hand History must auto-identify the single active tournament table (no manual
table-id guessing), show actual completed hands, and group/filter by blind
level.

# Implementation

- HandHistoryRecord gains level_index; hands endpoint returns level + blindLevel.
- GET /api/active-table returns the most recent session id.
- HistoryPage auto-loads the active table and groups rows by blind level.

# Acceptance Criteria

History loads without typing a table id; completed hands appear; grouped by
level; no fabricated history.
