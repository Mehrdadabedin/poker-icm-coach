---
id: 027
title: Range Matrix
phase: 3
status: complete
depends_on: [2, 19]
test_file: backend/tests/strategy/test_range_matrix.py
implementation_files: [backend/app/strategy/range_matrix.py, backend/app/strategy/baseline_ranges.py]
---

# Objective

Implement the 13x13 range matrix and baseline strategy ranges: pairs/suited/offsuit with OPEN/CALL/3-BET/FOLD/JAM and mixed frequencies, per position and stack depth.

# Requirements

- 13x13 matrix model with suit categories.
- Baseline ranges per position (UTG..BB) and stack depth bands (100..<5 BB).
- Range types: open raise, call, 3-bet, 4-bet, 3-bet jam, call 3-bet, fold to 3-bet, SB open, BB defense, BB vs BTN, BTN vs blinds, reshove, open jam, call jam, fold to jam.
- Mixed frequency representation (e.g., AJs raise 70 / call 20 / fold 10).
- Clearly a BASELINE STRATEGY RANGE — not claimed solver-exact.

# Dependencies

Parts 002, 019.

# Tests

Matrix size, category mapping, frequency sums, position/depth lookups exist.

# Implementation

backend/app/strategy/range_matrix.py + baseline_ranges.py with data module.

# Acceptance Criteria

Range matrix tests pass.

# Notes

Data can live in CSV/JSON under backend/app/strategy/data/ to stay under line limits.
