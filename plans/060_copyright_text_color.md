---
id: 060
title: Copyright Text Color (Gold Accent)
phase: 5
status: complete
depends_on: [59]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/styles/pages.css]
---

# Objective

Before: the copyright footer used #1565c0 (the blue .btn-primary Home color).
After: the copyright text color uses the application's EXISTING gold/yellow
accent variable (--accent = #f2c14e), the same gold used by the yellow
action buttons and accents throughout the app. Reused the existing CSS
variable (no new color introduced).

# Change

- pages.css .app-footer: color: #1565c0 -> color: var(--accent).
- No wording, font, size, position, alignment, spacing, border, background,
  or layout changes. No component/functionality changes.

# Acceptance Criteria

Copyright text renders gold (rgb(242,193,78)) at desktop and mobile; wording
unchanged; only the one color property changed; build + tests pass.
