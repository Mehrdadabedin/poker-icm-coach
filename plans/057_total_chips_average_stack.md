---
id: 057
title: Total Chips + Average Stack Display
phase: 5
status: complete
depends_on: [47]
test_file: backend/tests/test_settings_history.py
implementation_files: [backend/app/services/game_state_view.py, frontend/src/components/PokerTable.tsx, frontend/src/models/game.ts]
---

# Objective

Show TOTAL CHIPS and AVERAGE STACK in the table info area, computed from the
actual tournament stacks (single source of truth). Re-entry-added chips and
eliminations must be reflected.

# Implementation

- game_state_view: totalChips = sum of all player stacks; averageStack =
  totalChips / count(non-eliminated players) (0 if none).
- Frontend table-status bar shows both, formatted like existing chip values.

# Acceptance Criteria

Numbers match actual stacks; change after losses, eliminations and re-entry.
