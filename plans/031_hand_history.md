---
id: 031
title: Hand History
phase: 3
status: planned
depends_on: [14, 29]
test_file: backend/tests/services/test_hand_history.py
implementation_files: [backend/app/services/hand_history.py]
---

# Objective

Implement hand history: record every hand (hero cards, position, board, stacks, blind level, actions, pot, winner, coach rec, hero decision, ICM pressure, stage) and replay/review service.

# Requirements

- HandHistoryRecord dataclass + store (in-memory now, DB persisted in part 33).
- replay(record) returns readable action log.
- Query by hand number / filter by stage.

# Dependencies

Parts 14, 29.

# Tests

Record creation, replay ordering, filter queries.

# Implementation

backend/app/services/hand_history.py.

# Acceptance Criteria

History tests pass.

# Notes

Persistence to PostgreSQL lands in part 33.
