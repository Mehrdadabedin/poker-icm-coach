---
id: 054
title: Configurable Tournament Settings
phase: 5
status: complete
depends_on: [46, 47]
test_file: backend/tests/test_api.py
implementation_files: [backend/app/api/routes_meta.py, backend/app/api/routes_game.py, frontend/src/pages/SettingsPage.tsx]
---

# Objective

Tournament Settings become editable: starting stack, starting blinds (SB/BB),
blind level duration, fast mode. Changes affect the actual tournament engine.
Defaults stay 45,000 / 100-100 / 20 min / OFF.

# Implementation

- Module-level tournament settings store; PUT /api/settings updates it;
  GET /api/settings returns it.
- create_tournament uses stored settings (request fields optional overrides).
- build_default_tournament parameterized (stack, blinds); blind structure
  scales from the configured starting blinds.
- SettingsPage editable inputs + SAVE.

# Acceptance Criteria

Changed settings produce a tournament with the new stack/blinds/duration/fast
mode; existing settings loading preserved.
