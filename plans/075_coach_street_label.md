---
id: 075
title: The Coach Says Which Street Its Advice Is For
phase: 6
status: complete
depends_on: [73]
test_file: frontend/tests/coach_panel_street.test.tsx
implementation_files: [backend/app/strategy/coach.py, backend/app/services/session_coach.py, backend/app/schemas/coach_schemas.py, frontend/src/components/CoachPanelView.tsx, frontend/src/models/game.ts, frontend/src/styles/coach-panel.css]
---

# Objective

The owner's suggestion: next to BET, say whether it is the flop, turn or
river, so the advice names the board it is for.

# Changes

- `CoachRecommendation.street` carries the request's street; the advice JSON
  has `street` (`advice_dict`, and `CoachResponseModel`, which lists every
  field of the table's coach route and dropped it at first).
- The coach panel shows a label next to the action: "preflop", "on the
  flop", "on the turn", "on the river". The action keeps its own element
  (`.coach-recommendation` still reads "BET"): grading compares that word and
  the demo video script reads it.
- No label when the advice has no street.

# Tests

- frontend/tests/coach_panel_street.test.tsx: a label per street, the action
  unchanged, no label without a street.
- backend/tests/strategy/test_coach_street_label.py: the advice names its
  street on every street; the table's coach API sends it (this one failed
  until the response model listed the field).
- Checked on a live local table: the panel read "CALL on the flop".
- Frontend 270, backend 662 passed.
