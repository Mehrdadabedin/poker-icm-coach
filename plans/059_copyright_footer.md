---
id: 059
title: Copyright Footer (NEXORA / Mehrdad Abedin)
phase: 5
status: complete
depends_on: [45]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/components/Copyright.tsx, frontend/src/pages/*.tsx, frontend/src/styles/pages.css]
---

# Objective

Add the copyright line "© 2026 NEXORA — Created by Mehrdad Abedin" to the
application's navigation/footer area: right-aligned on desktop, compact and
inside the existing responsive layout on mobile, using the existing Home
button background color (#1565c0 / .btn-primary). UI-only; no functionality
changes.

# Implementation

- New reusable <Copyright /> component rendered once per page inside the
  existing .page container (normal flow -> cannot overlap content).
- .app-footer CSS: right-aligned, color #1565c0, small type, top border;
  slightly smaller on <=640px.
- Pages: Home, Training, Ranges, Coach, Settings, History, Statistics.

# Acceptance Criteria

Visible at desktop/tablet/mobile; no overlap; Home and Training still work;
no horizontal scroll on mobile; build + tests pass.
