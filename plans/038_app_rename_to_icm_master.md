---
id: 038
title: Application Rename to ICM Master
phase: 5
status: complete
depends_on: [37]
test_file: frontend/tests/capacitor.test.ts
implementation_files: [frontend/index.html, frontend/capacitor.config.ts, frontend/src/pages/HomePage.tsx, frontend/src/pages/TablePage.tsx, backend/app/main.py]
---

# Objective

Rename the application from "POKER ICM COACH" / "Poker ICM Coach" to exactly
"ICM Master" on every surface: browser title, React headers, Capacitor/Android
app name, backend API title and docs. Branding (gold/yellow accents) unchanged.

# Requirements

- "ICM MASTER" screens title on Home and Table pages.
- <title>ICM Master</title> in index.html.
- capacitor appName: "ICM Master" (Android launcher name).
- FastAPI title "ICM Master API".
- Keep menu item "ICM COACH" (feature, not app name) and all other buttons.

# Dependencies

Part 037 (finished baseline).

# Tests

Update capacitor.test.ts + table.test.tsx + e2e heading expectations; vitest + build.

# Implementation

Text replacement across listed files; no logic change.

# Acceptance Criteria

grep finds no remaining "Poker ICM Coach"/"POKER ICM COACH" UI strings; build passes.

# Notes

Docs (README, progress.md) updated to match.
